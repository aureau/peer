import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const nums = JSON.parse(execSync("gh issue list --limit 100 --json number", { encoding: "utf8" })).map(
  (i) => i.number,
);

let fixed = 0;
for (const n of nums) {
  const body = execSync(`gh issue view ${n} --json body -q .body`, { encoding: "utf8" });
  if (!body.includes("\\n")) continue;
  const fixedBody = body.replace(/\\n/g, "\n");
  if (fixedBody === body) continue;
  const tmp = join(tmpdir(), `issue-body-${n}.md`);
  writeFileSync(tmp, fixedBody, "utf8");
  execSync(`gh issue edit ${n} --body-file ${JSON.stringify(tmp)}`);
  unlinkSync(tmp);
  fixed++;
  process.stdout.write(".");
}

console.log(`\nFixed ${fixed} issue bodies`);
