import cliProgress from "cli-progress";
import fs from "fs";
import path from "path";
import { doRequest, encodeQueryData, sleep } from "./services/APIService";
import { SnapshotRecord } from "./interfaces/SnapshotRecord.interface";

// Random Earth API Base URL
const RandomEarthBaseURL = "https://randomearth.io/api/items";
// Fill it with the collection NFT contract
// Example: const CollectionAddress = "terra1whyze49j9d0672pleaflk0wfufxrh8l0at2h8q";
const CollectionAddress = "<<CollectionAddress>>";
const ProgressBar = new cliProgress.SingleBar(
  {},
  cliProgress.Presets.shades_classic
);

(async () => {
  let totalPages = -1;
  let currentPage = 1;
  let RESnapshot = {};

  console.log(`Taking Owners snapshot from: ${CollectionAddress}`);
  do {
    const getQuery = {
      collection_addr: CollectionAddress,
      page: currentPage,
    };
    const url = `${RandomEarthBaseURL}?${encodeQueryData(getQuery)}`;
    try {
      const data = await doRequest(url);
      // Set total pages and progress bar on first execution
      if (totalPages === -1) {
        totalPages = data.pages;

        // Create progress bar
        ProgressBar.start(totalPages, 1);
      }

      for (const item of data.items) {
        // If owner is not found create new record
        if (!RESnapshot.hasOwnProperty(item.user_addr)) {
          const SnapshotRecord = {
            owner: item.user_addr,
            tokens_found: 1,
            token_ids: [item.token_id],
          };
          RESnapshot[SnapshotRecord.owner] = SnapshotRecord;
        }
        // If owner found just update data
        else {
          RESnapshot[item.user_addr].tokens_found++;
          RESnapshot[item.user_addr].token_ids.push(item.token_id);
        }
      }
      currentPage++;
      if (currentPage <= totalPages) {
        ProgressBar.update(currentPage);
      }
    } catch (err) {
      console.error(err);
      await sleep(100);
    }
  } while (currentPage <= totalPages);

  ProgressBar.stop();
  // Convert object to array
  let SnapshotArray: SnapshotRecord[] = Object.values(RESnapshot);

  // Sort by token numbers
  SnapshotArray = SnapshotArray.sort((a, b) =>
    a.tokens_found < b.tokens_found ? -1 : 1
  );

  const totalTokensFound = SnapshotArray.reduce(
    (sum, item) => (sum += item.tokens_found),
    0
  );
  const SnapshotFileName = "./snapshot.json";
  // Create JSON file
  fs.writeFileSync(SnapshotFileName, JSON.stringify(SnapshotArray));
  const SnapshotAbsolutePath = path.resolve(SnapshotFileName);
  const now = new Date();

  console.log(
    `Snapshot taken sucessfully at ${now}, Tokens found: ${totalTokensFound}`
  );
  console.log(`You can check the snapshot here: ${SnapshotAbsolutePath}`);
})();
