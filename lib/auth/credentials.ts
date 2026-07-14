export type LoginCredentials = {
  email: string;
  password: string;
};

export function parseLoginCredentials(formData: FormData): LoginCredentials | null {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");

  if (typeof emailValue !== "string" || typeof passwordValue !== "string") {
    return null;
  }

  const email = emailValue.trim().toLowerCase();
  if (
    email.length < 3 ||
    email.length > 320 ||
    !email.includes("@") ||
    passwordValue.length < 6 ||
    passwordValue.length > 1024
  ) {
    return null;
  }

  return { email, password: passwordValue };
}
