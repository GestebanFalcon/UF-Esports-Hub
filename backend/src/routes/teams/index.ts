import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { teamCreateSchema, teamUpdateSchema, teamResponseSchema, teamListSchema, type TeamCreate, type TeamUpdate, type TeamResponse } from "@uf-esports-hub/shared";

export interface TeamStore {
  list(): Promise<TeamResponse[]>;
  detail(id: string): Promise<TeamResponse | null>;
  create(managerId: string, data: TeamCreate): Promise<TeamResponse>;
  update(id: string, managerId: string, data: TeamUpdate): Promise<TeamResponse | null>;
}
export interface VerifiedTeamIdentity { id: string; role: "player" | "manager" | "admin" }
export interface TeamRouteDependencies {
  /** Must verify the session and populate res.locals.verifiedTeamIdentity from trusted server data. */
  authenticate: RequestHandler;
  store: TeamStore;
}
export class TeamConflictError extends Error {}

/** This router MUST NOT be mounted before #10, #15 and role verification are integrated. */
export function createTeamRouter({ authenticate, store }: TeamRouteDependencies) {
  const router = Router();
  // Documented visibility: team list and detail require authentication.
  router.use(authenticate);
  router.use((_req, res, next) => {
    const identity: unknown = res.locals.verifiedTeamIdentity;
    if (!identity || typeof identity !== "object") return void res.status(401).json({ message: "Authentication required." });
    const i = identity as Record<string, unknown>;
    if (!z.uuid().safeParse(i.id).success || !["player", "manager", "admin"].includes(String(i.role)))
      return void res.status(401).json({ message: "Authentication required." });
    next();
  });
  const current = (res: { locals: Record<string, any> }) => res.locals.verifiedTeamIdentity as VerifiedTeamIdentity;
  router.get("/", async (_req, res) => {
    try { res.json(teamListSchema.parse({ teams: await store.list() })); }
    catch (error) { console.error("Team list failure", error); res.status(500).json({ message: "Unable to list teams." }); }
  });
  router.get("/:id", async (req, res) => {
    if (!z.uuid().safeParse(req.params.id).success) return void res.status(400).json({ message: "Invalid team ID." });
    try {
      const team = await store.detail(req.params.id as string);
      if (!team) return void res.status(404).json({ message: "Team not found." });
      res.json(teamResponseSchema.parse(team));
    } catch (error) { console.error("Team detail failure", error); res.status(500).json({ message: "Unable to retrieve team." }); }
  });
  router.post("/", async (req, res) => {
    const identity = current(res);
    if (identity.role !== "manager") return void res.status(403).json({ message: "Manager access required." });
    const data = teamCreateSchema.safeParse(req.body);
    if (!data.success) return void res.status(400).json({ message: "Invalid team fields.", fieldErrors: data.error.flatten().fieldErrors });
    try {
      res.status(201).json(teamResponseSchema.parse(await store.create(identity.id, data.data)));
    } catch (error) {
      if (error instanceof TeamConflictError) return void res.status(409).json({ message: "Team conflicts with an existing record." });
      console.error("Team creation failure", error); res.status(500).json({ message: "Unable to create team." });
    }
  });
  router.patch("/:id", async (req, res) => {
    const identity = current(res);
    if (identity.role !== "manager") return void res.status(403).json({ message: "Manager access required." });
    if (!z.uuid().safeParse(req.params.id).success) return void res.status(400).json({ message: "Invalid team ID." });
    const data = teamUpdateSchema.safeParse(req.body);
    if (!data.success) return void res.status(400).json({ message: "Invalid team fields.", fieldErrors: data.error.flatten().fieldErrors });
    try {
      // Store MUST use atomic WHERE id = teamId AND manager_id = verified identity.
      const updated = await store.update(req.params.id as string, identity.id, data.data);
      if (!updated) return void res.status(404).json({ message: "Team not found or not owned by this manager." });
      res.json(teamResponseSchema.parse(updated));
    } catch (error) {
      if (error instanceof TeamConflictError) return void res.status(409).json({ message: "Team conflicts with an existing record." });
      console.error("Team update failure", error); res.status(500).json({ message: "Unable to update team." });
    }
  });
  return router;
}
