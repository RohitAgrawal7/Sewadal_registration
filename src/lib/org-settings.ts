export const orgSettings = {
  defaultCountry: "India",
  defaultState: "Maharashtra",
  minimumAge: 16,
  orgName: "Member Registry",
  locationName: "Chhatrapati Sambhaji Nagar",
  locationSlug: "chhatrapati-sambhaji-nagar",
  khetra: "Chhatrapati Sambhaji Nagar",
  zone: "Maharashtra",
} as const;

export function listsLocationPath() {
  return `/lists/${orgSettings.locationSlug}`;
}

export function listsUnitPath(unit: string) {
  return `/lists/${orgSettings.locationSlug}/${unit}`;
}
