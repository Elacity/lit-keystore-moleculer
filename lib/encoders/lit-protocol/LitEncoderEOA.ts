import { KeySystemId, ProtectionType } from "../../constants/index.js";
import createLitEncoder from "./LitEncoder.js";

export default createLitEncoder({
  keySystemId: KeySystemId.CencDRM_LitV1,
  protectionType: ProtectionType.CencDRM_LitV1,
  actionIpfsId: "QmQgw91ZjsT1VkhxtibNV4zMet6vQTtQwL4FK5cRA8xHim",
  accessCheckIpfsId: "QmVdU5MhsQg5mhZNNmp3qx3bbuGw6FPrUGws1yUycY9vsS",
});
