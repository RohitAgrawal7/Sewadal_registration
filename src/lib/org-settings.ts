export const orgSettings = {
  defaultCountry: "Kenya",
  minimumAge: 16,
  orgName: "Member Registry",
  locationName: "Chhatrapati Sambhaji Nagar",
  locationSlug: "chhatrapati-sambhaji-nagar",
} as const;

export function listsLocationPath() {
  return `/lists/${orgSettings.locationSlug}`;
}

export function listsUnitPath(unit: string) {
  return `/lists/${orgSettings.locationSlug}/${unit}`;
}
