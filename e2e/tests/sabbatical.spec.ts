import { expect, test } from "@playwright/test";

test("the sabbatical entry sits between Prove and Meta and opens by deep link", async ({
  page,
}) => {
  await page.goto("/");
  const items = page.locator("#experience li.timeline-item h3");
  await items.first().waitFor();
  const companies = await items.allTextContents();
  const i = companies.findIndex((name) => name.includes("Sabbatical"));
  expect(i).toBeGreaterThan(0);
  expect(companies[i - 1]).toContain("Prove");
  expect(companies[i + 1]).toContain("Meta");

  await page.goto("/?company=sabbatical");
  const dialog = page.getByRole("dialog", { name: "Sabbatical" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "Made up for lost time during COVID-19 by exploring the world, chasing outdoor adventures, and spending time with family.",
  );
  for (const text of [
    "Made up for lost time during COVID-19 with a road trip through Seattle, Portland, San Francisco, Austin, New York, Washington, DC, Chicago, Los Angeles, and San Diego.",
    "Spent 50 nights camping and hiking, and skied 100 days that season in Colorado and Utah.",
    "Traveled through Europe, spent time with family members in need, and relocated back to Denver from California.",
    "10/2022 - 05/2023",
  ]) {
    await expect(dialog).toContainText(text);
  }
  await expect(dialog.getByRole("link")).toHaveCount(0);
});
