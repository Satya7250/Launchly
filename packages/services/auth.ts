import { auth } from "@repo/auth";
import { auditService } from "./audit.js";

export class AuthService {
  public async signUp(body: { email: string; name: string; password: string }) {
    const response = await auth.api.signUpEmail({
      body: {
        email: body.email,
        password: body.password,
        name: body.name,
      },
      asResponse: true,
    });
    return response;
  }

  public async signIn(body: { email: string; password: string }) {
    const response = await auth.api.signInEmail({
      body: {
        email: body.email,
        password: body.password,
      },
      asResponse: true,
    });
    return response;
  }

  public async signOut(headers: HeadersInit) {
    const response = await auth.api.signOut({
      headers,
      asResponse: true,
    });
    return response;
  }
}

export const authService = new AuthService();
