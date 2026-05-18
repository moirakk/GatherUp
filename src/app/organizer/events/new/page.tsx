import { CalendarCheck, MapPinned, QrCode } from "lucide-react";

export default function NewEventPage() {
  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">创建活动</p>
          <h1>创建活动</h1>
          <p className="subtle">组织者先配置活动信息、数调、地点投票和收款二维码，参与者登录后才进入后续流程。</p>
        </div>
      </section>

      <section className="form-layout">
        <article className="content-card">
          <h2>基础信息</h2>
          <div className="form-grid">
            <label>活动名称<input defaultValue="春季社团招新开放日" /></label>
            <label>活动场景<select defaultValue="campus"><option value="community">同好活动</option><option value="campus">校园活动</option><option value="conference">会议会务</option><option value="private">好友聚会</option><option value="workshop">工作坊</option></select></label>
            <label>流程模板<select defaultValue="checkin"><option value="basic">基础报名</option><option value="payment">报名收款</option><option value="seating">选座活动</option><option value="checkin">签到活动</option><option value="record">记录型聚会</option></select></label>
            <label>细分标签<input defaultValue="校园招新" /></label>
            <label>城市<input defaultValue="广州" /></label>
            <label>场地<input defaultValue="大学生活动中心" /></label>
            <label>日期和时间<input defaultValue="2026-07-12 10:00" /></label>
          </div>
        </article>

        <article className="content-card">
          <h2>报名和订单规则</h2>
          <div className="form-grid">
            <label>活动人数上限<input defaultValue="300" /></label>
            <label>单人费用<input defaultValue="0" /></label>
            <label>多人报名<select defaultValue="deny"><option value="allow">允许</option><option value="deny">不允许</option></select></label>
            <label>订单编号<select defaultValue="event"><option value="event">{"{eventCode}-0001"}</option><option>GU-0001</option></select></label>
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <h2>数调设置</h2>
            <CalendarCheck size={20} />
          </div>
          <p className="subtle">先收集参与者可参加时间，组织者定案后再开放报名付款。</p>
          <div className="form-grid">
            <label>时间选项 1<input defaultValue="6月21日 周日 14:00" /></label>
            <label>时间选项 2<input defaultValue="6月22日 周一 19:30" /></label>
            <label>时间选项 3<input defaultValue="6月23日 周二 19:30" /></label>
            <label>数调规则<select defaultValue="multi"><option value="multi">可多选</option><option value="single">单选</option></select></label>
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <h2>地点投票</h2>
            <MapPinned size={20} />
          </div>
          <p className="subtle">地点可由组织者预设，参与者登录后投票表达偏好。</p>
          <div className="form-grid">
            <label>地点选项 1<input defaultValue="百丽宫影城 环贸店" /></label>
            <label>地点选项 2<input defaultValue="大光明电影院" /></label>
            <label>地点选项 3<input defaultValue="百美汇影城 静安店" /></label>
            <label>最终确认<select defaultValue="organizer"><option value="organizer">组织者最终确认</option><option value="auto">票数最高自动确认</option></select></label>
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <h2>收款二维码</h2>
            <QrCode size={20} />
          </div>
          <p className="subtle">第一版不接入真实支付，由参与者上传付款截图，组织者人工确认。</p>
          <div className="form-grid">
            <label>收款方式<select defaultValue="wechat"><option value="wechat">微信收款码</option><option value="alipay">支付宝收款码</option><option value="bank">银行转账信息</option></select></label>
            <label>收款二维码<input type="file" accept="image/*" /></label>
            <label>付款备注格式<input defaultValue="订单号 + 昵称" /></label>
          </div>
        </article>
      </section>
    </>
  );
}
