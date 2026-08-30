import type { MemberWithDerived } from "@/lib/dates";
import { Gender } from "@/lib/enums";

export type DemographicCounts = {
  total: number;
  male: number;
  female: number;
  child: number;
};

/** Counts from gender field: Male, Female, Child. */
export function countDemographics(
  members: MemberWithDerived[]
): DemographicCounts {
  let male = 0;
  let female = 0;
  let child = 0;

  for (const m of members) {
    if (m.gender === Gender.Male) male += 1;
    else if (m.gender === Gender.Female) female += 1;
    else if (m.gender === Gender.Child) child += 1;
  }

  return {
    total: members.length,
    male,
    female,
    child,
  };
}
