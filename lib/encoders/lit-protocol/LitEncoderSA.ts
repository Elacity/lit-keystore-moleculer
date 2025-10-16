import { KeySystemId, ProtectionType } from "../../constants/index.js";
import createLitEncoder from "./LitEncoder.js";

export default createLitEncoder({
  keySystemId: KeySystemId.CencDRM_LitSAV1,
  protectionType: ProtectionType.CencDRM_LitSAV1,
  actionIpfsId: "QmWDBNCk1xHk8giLn1cxFrBke7aPFTuXsMDsnn9Pom1wZu",
  accessCheckIpfsId: "QmayEHFfJiZbryYyCsUUEu4drhhDM4FkmxM6RZMcy67zHP",
});
