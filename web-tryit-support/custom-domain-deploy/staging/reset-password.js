/*
 * TryIt — STAGING password reset page (Preview only).
 *
 * Supabase client: @supabase/supabase-js 2.119.0, UMD build (dist/umd/supabase.js),
 * self-hosted as /staging/supabase.min.js. No CDN.
 *   Source tarball: https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.119.0.tgz
 *   Tarball integrity (npm): sha512-MKP49G6bJbPhvsZDegZ/IXS/ITApPgplDCF5+F65KZ5kIArS5Y90WFxwvWYALx2bsxdrSuHvkCiXHYr3dU8+sw==
 *   sha256(supabase.min.js): a867edbcfb029370aeec7223dd6180b560b621fbe3bc64c6584fb0369d1b7bce
 *
 * Config: STAGING project only (ulypvkjizdnrszaulzqy, "TryIt Staging"), with its
 * PUBLISHABLE key (public by design). Never a service-role/secret key or a
 * production URL/key.
 *
 * Token rules: the recovery token_hash is read from the URL fragment, the
 * fragment is removed immediately, and the token lives only in a JS variable.
 * It is never stored, logged or displayed. No network request happens before
 * the user taps Continue (the client is created lazily on that tap).
 */
(function () {
  "use strict";

  // ---- 1. Capture the fragment and remove it before anything else. --------
  var params = new URLSearchParams(location.hash.slice(1));
  var tokenHash = params.get("token_hash");
  var linkType = params.get("type");
  params = null;
  history.replaceState(null, "", location.pathname);

  var SUPABASE_URL = "https://ulypvkjizdnrszaulzqy.supabase.co";
  var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ymoS40WyL8bgo616l7a8CQ__ZTkKCqU";

  // App minimum is 6. The staging Auth password policy could not be read, so
  // 6 is enforced here and Supabase stays the final validator.
  var MIN_PASSWORD_LENGTH = 6;

  var MSG_INVALID = "This reset link is invalid. Request a new one from the TryIt app.";
  var MSG_EXPIRED = "This link has expired or was already used. Request a new one from the TryIt app.";
  var MSG_VERIFY_TEMP = "Something went wrong. Please try again in a moment.";
  var MSG_UPDATE_TEMP = "Something went wrong on our side. Please try again in a moment.";

  var client = null;
  var busy = false;

  function getClient() {
    if (client) return client;
    if (!window.supabase || typeof window.supabase.createClient !== "function") return null;
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return client;
  }

  // ---- Error classification (never surfaces raw error text). --------------
  function errStatus(err) {
    return err && typeof err.status === "number" ? err.status : 0;
  }
  function errCode(err) {
    return err && typeof err.code === "string" ? err.code : "";
  }
  function isTemporary(err) {
    if (!err) return false;
    var status = errStatus(err);
    var code = errCode(err);
    if (err.name === "AuthRetryableFetchError") return true;
    if (status === 0 || status === 429 || status >= 500) return true;
    if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || code === "request_timeout") return true;
    return false;
  }
  function isPasswordRejected(err) {
    var code = errCode(err);
    return code === "weak_password" || code === "same_password" || errStatus(err) === 422;
  }
  function isExpiredSession(err) {
    var code = errCode(err);
    var status = errStatus(err);
    return (
      code === "otp_expired" || code === "session_not_found" || code === "session_expired" ||
      code === "bad_jwt" || code === "no_authorization" || code === "user_not_found" ||
      status === 401 || status === 403
    );
  }
  function passwordRejectedMessage(err) {
    var msg = "That password can't be used. Choose a different one with at least " + MIN_PASSWORD_LENGTH + " characters";
    var reasons = err && err.weakPassword && Array.isArray(err.weakPassword.reasons) ? err.weakPassword.reasons : [];
    var weakChars = errCode(err) === "weak_password" && (reasons.length === 0 || reasons.some(function (r) { return r !== "length"; }));
    return msg + (weakChars ? ", mixing letters and numbers." : ".");
  }

  // ---- UI helpers. ----------------------------------------------------------
  var STATES = ["state-invalid", "state-start", "state-expired", "state-form", "state-done"];
  function $(id) { return document.getElementById(id); }
  function show(stateId) {
    STATES.forEach(function (id) { $(id).hidden = id !== stateId; });
  }
  function setText(id, text) {
    var el = $(id);
    el.textContent = text || "";
    el.hidden = !text;
  }

  function goExpired() {
    tokenHash = null;
    show("state-expired");
  }

  // ---- 4/5. Continue → verifyOtp. -------------------------------------------
  async function onContinue() {
    if (busy || !tokenHash) return;
    var btn = $("continue-btn");
    setText("start-error", "");
    var sb = getClient();
    if (!sb) {
      setText("start-error", MSG_VERIFY_TEMP);
      return;
    }
    busy = true;
    btn.disabled = true;
    var result;
    try {
      result = await sb.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    } catch (e) {
      result = { error: { name: "AuthRetryableFetchError", status: 0 } };
    }
    busy = false;
    var error = result && result.error;
    if (!error) {
      tokenHash = null;
      show("state-form");
      $("new-password").focus();
      return;
    }
    if (isTemporary(error)) {
      // Keep tokenHash in memory so Continue can be retried.
      setText("start-error", MSG_VERIFY_TEMP);
      btn.disabled = false;
      return;
    }
    // otp_expired, invalid, 400/403 and anything else non-temporary.
    goExpired();
  }

  // ---- 6/7. New password → updateUser. --------------------------------------
  function validate() {
    var pw = $("new-password").value;
    var confirm = $("confirm-password").value;
    var ok = true;
    if (pw.length < MIN_PASSWORD_LENGTH) {
      setText("new-password-error", "Use at least " + MIN_PASSWORD_LENGTH + " characters.");
      ok = false;
    } else {
      setText("new-password-error", "");
    }
    if (confirm !== pw) {
      setText("confirm-password-error", "Passwords don't match.");
      ok = false;
    } else {
      setText("confirm-password-error", "");
    }
    return ok ? pw : null;
  }

  function setFormBusy(isBusy) {
    busy = isBusy;
    $("submit-btn").disabled = isBusy;
    Array.prototype.forEach.call(document.querySelectorAll(".toggle"), function (b) { b.disabled = isBusy; });
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setText("form-error", "");
    var password = validate();
    if (password === null) return;
    var sb = getClient();
    if (!sb) {
      setText("form-error", MSG_UPDATE_TEMP);
      return;
    }
    setFormBusy(true);
    var result;
    try {
      result = await sb.auth.updateUser({ password: password });
    } catch (e) {
      result = { error: { name: "AuthRetryableFetchError", status: 0 } };
    }
    password = null;
    var error = result && result.error;
    if (!error) {
      try { await sb.auth.signOut({ scope: "local" }); } catch (e) { /* local only */ }
      $("new-password").value = "";
      $("confirm-password").value = "";
      setFormBusy(false);
      show("state-done");
      return;
    }
    setFormBusy(false);
    if (isTemporary(error)) {
      setText("form-error", MSG_UPDATE_TEMP);
      return;
    }
    if (isPasswordRejected(error)) {
      // Recovery session is still valid: keep the form, never re-verify.
      setText("form-error", passwordRejectedMessage(error));
      $("new-password").focus();
      return;
    }
    if (isExpiredSession(error)) {
      show("state-expired");
      return;
    }
    setText("form-error", MSG_UPDATE_TEMP);
  }

  function onToggle(event) {
    var btn = event.currentTarget;
    var input = $(btn.getAttribute("data-target"));
    var reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    btn.textContent = reveal ? "Hide" : "Show";
    btn.setAttribute("aria-pressed", reveal ? "true" : "false");
  }

  // ---- 2/3. Initial state: no API call on load. ------------------------------
  function init() {
    if (!tokenHash || linkType !== "recovery") {
      tokenHash = null;
      show("state-invalid");
    } else {
      show("state-start");
    }
    linkType = null;
    $("continue-btn").addEventListener("click", onContinue);
    $("password-form").addEventListener("submit", onSubmit);
    Array.prototype.forEach.call(document.querySelectorAll(".toggle"), function (b) {
      b.addEventListener("click", onToggle);
    });
    $("hint").textContent = "At least " + MIN_PASSWORD_LENGTH + " characters.";
  }

  // A new link pasted into this same tab only changes the fragment (no page
  // load). Reload so the capture-and-clear step above runs again for it.
  window.addEventListener("hashchange", function () {
    if (location.hash.length > 1) location.reload();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
