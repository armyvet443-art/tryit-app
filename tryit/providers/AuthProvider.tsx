import createContextHook from "@nkzw/create-context-hook";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import { getOrCreateGuestId, getProfile, migrateGuestData } from "@/services/tryit-service";
import type { UserProfile } from "@/types/models";

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [guestId, setGuestId] = useState<string>("");
  const queryClient = useQueryClient();
  const migratedRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch((e) => console.log("[auth] getSession failed", e))
      .finally(() => setInitializing(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    getOrCreateGuestId()
      .then(setGuestId)
      .catch((e) => console.log("[auth] guest id failed", e));

    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  // Migrate guest reactions to the user account on first login/signup.
  // Runs once per guestId+userId pair to avoid duplicate work.
  useEffect(() => {
    if (!userId || !guestId) return;
    const migrationKey = `${guestId}:${userId}`;
    if (migratedRef.current === migrationKey) return;
    migratedRef.current = migrationKey;
    migrateGuestData(guestId, userId)
      .then((count) => {
        if (count > 0) {
          console.log(`[auth] migrated ${count} guest reactions to user ${userId}`);
          queryClient.invalidateQueries({ queryKey: ["myReactions"] });
        }
      })
      .catch((e) => console.log("[auth] migration failed", e));
  }, [userId, guestId, queryClient]);

  const profileQuery = useQuery<UserProfile | null>({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId as string),
    enabled: userId !== null,
  });

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, username: string, displayName: string) => {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: username.trim(),
            display_name: displayName.trim(),
          },
        },
      });
      if (error) throw error;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const refreshProfile = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["profile", userId] });
  }, [queryClient, userId]);

  return useMemo(
    () => ({
      session,
      userId,
      guestId,
      initializing,
      profile: profileQuery.data ?? null,
      isProfileLoading: profileQuery.isLoading,
      signIn,
      signInWithMagicLink,
      signUp,
      signOut,
      refreshProfile,
    }),
    [
      session,
      userId,
      guestId,
      initializing,
      profileQuery.data,
      profileQuery.isLoading,
      signIn,
      signInWithMagicLink,
      signUp,
      signOut,
      refreshProfile,
    ],
  );
});
