import { Arrow } from "../../../components/ui/Arrow";
import type { AuthMode } from "../types";
import { useAuthForm } from "../use-auth-form";
import { AuthField } from "./AuthField";

export function AuthForm({ mode, ready }: { mode: AuthMode; ready: boolean }) {
  const isLogin = mode === "login";
  const { errors, showPassword, setShowPassword, message, isSubmitting, submit } = useAuthForm(mode, ready);
  const passwordType = showPassword ? "text" : "password";
  const buttonText = !ready
    ? "Checking session..."
    : isSubmitting
      ? isLogin ? "Logging in..." : "Creating account..."
      : isLogin ? "Log in" : "Create account";

  return (
    <>
      <form onSubmit={submit} noValidate aria-busy={isSubmitting || !ready}>
        {!isLogin && (
          <AuthField
            name="username"
            label="Username"
            placeholder="Your in-game name"
            autoComplete="username"
            required
            error={errors.username}
          />
        )}
        <AuthField
          name="email"
          label="Email address"
          type="email"
          placeholder="you@ufl.edu"
          autoComplete={isLogin ? "username" : "email"}
          required
          error={errors.email}
        />
        <AuthField
          name="password"
          label="Password"
          type={passwordType}
          placeholder={isLogin ? "Enter your password" : "Create a password"}
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={isLogin ? undefined : 8}
          error={errors.password}
          hint={isLogin ? undefined : "Use at least 8 characters."}
          passwordToggle={
            <button
              className="visibility-toggle"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        />
        {!isLogin && (
          <AuthField
            name="confirmPassword"
            label="Confirm password"
            type={passwordType}
            placeholder="Enter your password again"
            autoComplete="new-password"
            required
            error={errors.confirmPassword}
          />
        )}
        <button className="button primary submit-button" type="submit" disabled={isSubmitting || !ready}>
          {buttonText} <Arrow />
        </button>
        <p className="form-note">
          {isLogin ? "Log in to your UF Esports Hub account." : "Create your account to join the UF Esports Hub."}
        </p>
        <p className="form-status" role="status">{message}</p>
      </form>
      <p className="auth-switch">
        {isLogin ? "New to the hub?" : "Already part of the community?"}{" "}
        <a href={isLogin ? "/register" : "/login"}>
          {isLogin ? "Create an account" : "Log in"} <Arrow />
        </a>
      </p>
    </>
  );
}
