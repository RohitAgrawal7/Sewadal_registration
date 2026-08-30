"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Member } from "@prisma/client";
import type { MemberWithDerived } from "@/lib/dates";
import { hydrateMember } from "@/lib/dates";
import { fetchMembersSnapshot } from "@/lib/members/actions";

type LiveMembers = {
  members: MemberWithDerived[];
  applyMember: (raw: Member) => void;
  reload: () => Promise<void>;
};

const MembersLiveContext = createContext<LiveMembers | null>(null);

function hydrateList(list: Member[] | MemberWithDerived[]): MemberWithDerived[] {
  return list.map((m) => {
    try {
      return hydrateMember(m);
    } catch {
      return m as MemberWithDerived;
    }
  });
}

function mergeById(
  current: MemberWithDerived[],
  incoming: MemberWithDerived[]
): MemberWithDerived[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export function MembersLiveProvider({
  initialMembers,
  children,
}: {
  initialMembers: MemberWithDerived[];
  children: React.ReactNode;
}) {
  const [members, setMembers] = useState(() => hydrateList(initialMembers));
  const mutated = useRef(false);

  useEffect(() => {
    const incoming = hydrateList(initialMembers);
    setMembers((current) =>
      mutated.current ? mergeById(current, incoming) : incoming
    );
  }, [initialMembers]);

  const reload = useCallback(async () => {
    const next = hydrateList(await fetchMembersSnapshot());
    mutated.current = true;
    setMembers((current) => mergeById(current, next));
  }, []);

  const applyMember = useCallback((raw: Member) => {
    mutated.current = true;
    try {
      const next = hydrateMember(raw);
      setMembers((list) => mergeById(list, [next]));
    } catch {
      void reload();
    }
  }, [reload]);

  return (
    <MembersLiveContext.Provider value={{ members, applyMember, reload }}>
      {children}
    </MembersLiveContext.Provider>
  );
}

export function useMembersLive() {
  const ctx = useContext(MembersLiveContext);
  if (!ctx) {
    throw new Error("useMembersLive must be used inside MembersLiveProvider");
  }
  return ctx;
}

export function useOptionalMembersLive() {
  return useContext(MembersLiveContext);
}
