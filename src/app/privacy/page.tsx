export default function PrivacyPage() {
  return (
    <div className="relative z-10 min-h-screen px-6 pb-16 pt-24">
      <article className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur-xl sm:p-8">
        <h1 className="text-3xl font-bold">隐私与站内私信说明</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-gray-300">
          <p>
            站内私信不是端到端加密通信。消息内容、图片、帖子分享、举报记录和必要的操作状态会保存在本站数据库中。
          </p>
          <p>
            为维护社区安全，管理员可以查看全部站内私信。管理员不能修改用户消息，但可以根据举报或违规情况警告、封禁账号。
          </p>
          <p>
            请勿发送密码、证件号码、支付信息、精确住址或其他敏感个人信息。你可以屏蔽其他用户、举报消息，并在个人页调整谁可以发起私信。
          </p>
          <p>
            消息可在发送后两分钟内对双方撤回；之后只能从自己的视图隐藏。举报相关记录可能继续保留用于安全处理。
          </p>
        </div>
      </article>
    </div>
  );
}
