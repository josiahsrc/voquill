import { Nullable } from "@repo/types";

export const getFirstAndLastName = (
  fullName: string,
): {
  firstName: Nullable<string>;
  lastName: Nullable<string>;
} => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { firstName: null, lastName: null };
  }

  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  return {
    firstName: firstName.trim() || null,
    lastName: lastName?.trim() || null,
  };
};

export const getInitials = (fullName: string): string => {
  const { firstName, lastName } = getFirstAndLastName(fullName);
  if (!firstName && !lastName) return "";
  if (firstName && !lastName) return firstName.charAt(0).toUpperCase();
  if (!firstName && lastName) return lastName.charAt(0).toUpperCase();
  return (
    (firstName ? firstName.charAt(0).toUpperCase() : "") +
    (lastName ? lastName.charAt(0).toUpperCase() : "")
  );
};
