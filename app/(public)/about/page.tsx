export const metadata = {
  title: "关于妙妙屋",
};

export default function AboutPage() {
  return (
    <div className="site-shell safe-pad py-12">
      <article className="soft-panel mx-auto max-w-3xl space-y-4 rounded-3xl p-8">
        <h1 className="brand-title text-4xl text-[var(--brand-deep)]">关于妙妙屋</h1>
        <p className="text-[var(--muted)]">
          《盼盼与熊大的妙妙屋》是一个个人小游戏网站，用来持续收录盼盼创作的
          HTML5 小游戏。游客可以直接浏览和游玩，不需要注册登录。
        </p>
        <p className="text-[var(--muted)]">
          “熊大”只作为项目名称使用。网站中的 Logo、插图和角色形象均为原创，不使用未授权的第三方角色素材。
        </p>
      </article>
    </div>
  );
}
