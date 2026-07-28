import { expect, test } from "@playwright/test";

test("游客打开首页且无登录提示", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "盼盼与熊大的妙妙屋" })).toBeVisible();
  await expect(page.getByRole("link", { name: "管理后台" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "登录" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "登录" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "注册" })).toHaveCount(0);
});

test("关于与隐私页可访问", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "关于妙妙屋" })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "隐私说明" })).toBeVisible();
});
