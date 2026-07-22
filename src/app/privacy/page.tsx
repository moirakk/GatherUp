import Link from "next/link";
import {
  BadgeAlert,
  CalendarClock,
  Database,
  Eye,
  Lock,
  Server,
  ShieldCheck,
  UserRoundCog
} from "lucide-react";

const lastUpdated = "2026-07-22";

export default function PrivacyPage() {
  return (
    <div className="stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">法律条款</p>
          <h1>隐私政策</h1>
          <p className="subtle">
            本政策说明 GatherUp 会收集哪些信息、如何使用和存储这些信息，以及你对自己数据拥有的权利，尤其是涉及付款凭证等敏感信息的处理方式。
          </p>
        </div>
      </section>

      <section className="guard-panel">
        <CalendarClock size={18} />
        <span>最近更新：{lastUpdated}。当前为 v0.1 阶段产品，数据处理方式会随功能上线持续更新。</span>
      </section>

      <article className="content-card setup-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01</p>
            <h2>我们收集哪些信息</h2>
          </div>
          <Database size={22} />
        </div>
        <div className="notice-list">
          <div>账号信息：邮箱、密码（加密存储）、昵称、GatherUp ID，用于登录、身份识别和活动名单管理。</div>
          <div>活动数据：你创建或报名的活动信息、报名表单填写内容、同行人信息、座位选择和签到状态。</div>
          <div>付款凭证：报名付费活动时上传的付款截图或凭证文件，用于组织者核实收款情况；退款流程中的退款凭证同样属于此类。</div>
          <div>操作日志：关键操作（如资料修改、GatherUp ID 变更、活动状态变化、审核动作）会被记录，用于安全审计和纠纷处理。</div>
          <div>设备与使用信息：登录设备、访问时间等技术信息，用于保障账号安全和排查异常行为。</div>
        </div>
      </article>

      <article className="content-card setup-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">02</p>
            <h2>信息如何被使用</h2>
          </div>
          <Eye size={22} />
        </div>
        <div className="notice-list">
          <div>邮箱和账号信息用于登录验证、账号找回和重要通知发送。</div>
          <div>活动数据用于报名、选座、签到、候补和通知等核心功能运转。</div>
          <div>付款凭证仅供对应活动的组织者（或获得付款权限的协办者）核实收款和处理退款，不用于任何其他商业目的。</div>
          <div>操作日志仅用于安全审计、异常排查和纠纷取证，不会被用于用户画像或广告推送。</div>
          <div>GatherUp 不会将你的个人信息出售给第三方，也不会未经同意将付款凭证等敏感信息提供给活动之外的第三方。</div>
        </div>
      </article>

      <article className="content-card setup-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">03</p>
            <h2>付款凭证的存储与留存策略</h2>
          </div>
          <Lock size={22} />
        </div>
        <div className="notice-list">
          <div>付款凭证和退款凭证存储在 Supabase Storage 的私有存储桶中，不会公开访问，只有对应活动的组织者、协办者和平台管理员在权限范围内可以查看。</div>
          <div>默认情况下，组织者可在活动结束后 90 天内查看已上传的付款凭证；超过该期限后，凭证访问会受到限制，该期限可由平台按活动配置调整。</div>
          <div>如活动存在未结的投诉或退款申请，凭证的可访问期限会相应延长，直到相关事项处理完毕。</div>
          <div>平台管理员在留存期限之后如需访问凭证（例如处理投诉或安全审计），相应访问会被记入审计日志。</div>
          <div>付款凭证一经上传即不可篡改删除，以保障交易记录的完整性和纠纷处理的可追溯性。</div>
        </div>
      </article>

      <article className="content-card setup-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">04</p>
            <h2>数据托管</h2>
          </div>
          <Server size={22} />
        </div>
        <div className="notice-list">
          <div>GatherUp 使用 Supabase 提供云端数据库、身份认证和文件存储服务，所有账号、活动、订单和凭证数据均托管在 Supabase 的云基础设施上。</div>
          <div>数据库访问通过行级安全策略（RLS）进行权限控制，确保每个用户只能访问自己有权限查看的数据。</div>
          <div>私有存储桶采用路径级别的访问策略，付款凭证等敏感文件不会被未授权用户访问。</div>
          <div>敏感操作（如资金相关的状态变更、权限调整）通过带审计记录的数据库事务处理，降低数据不一致和越权访问的风险。</div>
        </div>
      </article>

      <article className="content-card setup-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">05</p>
            <h2>你的数据权利</h2>
          </div>
          <UserRoundCog size={22} />
        </div>
        <div className="notice-list">
          <div>你可以在「我的活动 - 账号中心」查看和更新自己的昵称、GatherUp ID 等公开资料。</div>
          <div>你可以随时申请账号删除；提交申请前需要先处理完未结订单、退款、进行中的活动、组织者角色和未解决的争议。</div>
          <div>账号删除申请通过后，个人资料会被匿名化处理，但必要的交易记录和审计日志会依法依规继续保留，用于财务对账和安全审计。</div>
          <div>如对自己数据的收集或使用方式有疑问，可以通过账号中心的投诉入口或平台支持渠道联系我们。</div>
        </div>
      </article>

      <article className="content-card setup-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">06</p>
            <h2>信息安全</h2>
          </div>
          <ShieldCheck size={22} />
        </div>
        <div className="notice-list">
          <div>登录凭证使用加密存储，敏感操作通过 Supabase Auth 和服务端会话验证，避免未授权访问。</div>
          <div>密钥、服务角色凭证等后端配置不会出现在客户端代码或公开仓库中。</div>
          <div>尽管我们采取了合理的安全措施，任何互联网服务都无法保证绝对安全；如发现安全问题，欢迎通过安全报告渠道及时告知我们。</div>
        </div>
      </article>

      <article className="content-card setup-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">07</p>
            <h2>政策变更</h2>
          </div>
          <BadgeAlert size={22} />
        </div>
        <div className="notice-list">
          <div>我们可能根据产品迭代或法律法规要求更新本政策，更新后会在本页标注最近更新日期。</div>
          <div>重大变更（例如新增数据收集类型或改变留存策略）会通过站内通知或公告提前告知。</div>
          <div>继续使用 GatherUp 即表示你接受更新后的隐私政策。</div>
        </div>
        <div className="button-row">
          <Link className="button secondary" href="/terms">
            查看服务条款
          </Link>
        </div>
      </article>
    </div>
  );
}
