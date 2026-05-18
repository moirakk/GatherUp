export default function NewEventPage() {
  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">创建活动</p>
          <h1>线下观影活动</h1>
          <p className="subtle">第一版先用分组表单承载规则，避免组织者被字段压住。</p>
        </div>
      </section>

      <section className="form-layout">
        <article className="content-card">
          <h2>基础信息</h2>
          <div className="form-grid">
            <label>活动名称<input defaultValue="《坂本龙一：杰作》线下观影" /></label>
            <label>城市<input defaultValue="上海" /></label>
            <label>场地<input defaultValue="百丽宫影城 环贸店" /></label>
            <label>日期和时间<input defaultValue="2026-06-22 14:30" /></label>
          </div>
        </article>

        <article className="content-card">
          <h2>报名和订单规则</h2>
          <div className="form-grid">
            <label>活动人数上限<input defaultValue="60" /></label>
            <label>单人费用<input defaultValue="88" /></label>
            <label>多人报名<select defaultValue="allow"><option value="allow">允许</option><option>不允许</option></select></label>
            <label>订单编号<select defaultValue="event"><option value="event">{"{eventCode}-0001"}</option><option>GU-0001</option></select></label>
          </div>
        </article>
      </section>
    </>
  );
}
