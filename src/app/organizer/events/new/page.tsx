export default function NewEventPage() {
  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">创建活动</p>
          <h1>创建活动</h1>
          <p className="subtle">先选择活动场景和流程模板，再配置报名、收款、座位或签到规则。</p>
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
      </section>
    </>
  );
}
