import { Router } from "express";
import type { ActorService } from "./actor.service";

export function createActorRouter(service: ActorService): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(service.listActors());
  });

  return router;
}
