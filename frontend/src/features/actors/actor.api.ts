import { request } from "../../core/http";

export const actorApi = {
  list: () => request<string[]>("/actors"),
};
