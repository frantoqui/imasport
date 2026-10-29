import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { storage } from "./storage/resource.js";
import { userAdmin } from "./functions/user-admin/resource.js";

defineBackend({
  auth,
  data,
  storage,
  userAdmin,
});
