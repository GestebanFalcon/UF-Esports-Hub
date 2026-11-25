import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { playerProfiles } from "../../db/schema.js";
import type { ProfileStore } from "./index.js";
import { toProfile } from "@uf-esports-hub/shared";

export const profileStore: ProfileStore = {
    async getByUserId(userId) {
        const [row] = await db.select()
            .from(playerProfiles)
            .where(eq(playerProfiles.userId, userId))
            .limit(1);
        return row ? toProfile(row) : null;
    },
    async updateByUserId(userId, updates) {
        const [row] = await db.update(playerProfiles)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(playerProfiles.userId, userId))
            .returning();

        return row ? toProfile(row) : null;
    }
};
