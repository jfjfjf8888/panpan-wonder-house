export const metadata = {
  title: "隐私说明",
};

export default function PrivacyPage() {
  return (
    <div className="site-shell safe-pad py-12">
      <article className="soft-panel mx-auto max-w-3xl space-y-4 rounded-3xl p-8">
        <h1 className="brand-title text-4xl text-[var(--brand-deep)]">隐私说明</h1>
        <p className="text-[var(--muted)]">
          游客无需登录。网站只会生成匿名 visitor_id 与 session_id，用于统计访问量和游戏游玩情况。
        </p>
        <p className="text-[var(--muted)]">
          我们不会收集姓名、手机号或邮箱。后台只展示聚合后的统计数据，不会直接展示完整 IP。
        </p>
        <p className="text-[var(--muted)]">
          原始访问事件会按保留期限自动清理。广告功能默认关闭，关闭时不会加载任何广告脚本。
        </p>
      </article>
    </div>
  );
}
