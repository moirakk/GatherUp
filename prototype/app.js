const state = {
  view: "square",
  selectedEventId: "evt-001",
  selectedSeats: ["C5", "C6"],
};

const events = [
  {
    id: "evt-001",
    title: "《坂本龙一：杰作》线下观影",
    type: "线下观影",
    city: "上海",
    venue: "百丽宫影城 环贸店",
    date: "6月22日 周六 14:30",
    price: "¥88",
    left: 18,
    status: "报名中",
    statusClass: "open",
    multi: true,
  },
  {
    id: "evt-002",
    title: "春日同好重映场",
    type: "线下观影",
    city: "杭州",
    venue: "浙影时代影城",
    date: "6月29日 周六 19:00",
    price: "¥72",
    left: 6,
    status: "即将截止",
    statusClass: "review",
    multi: false,
  },
  {
    id: "evt-003",
    title: "生日咖试运营小聚",
    type: "生咖",
    city: "南京",
    venue: "雾岛咖啡",
    date: "7月5日 周五 12:00",
    price: "¥45",
    left: 24,
    status: "报名中",
    statusClass: "open",
    multi: true,
  },
];

const registrations = [
  {
    order: "RYU-0001",
    event: events[0].title,
    nickname: "比奇堡miki",
    quantity: 2,
    amount: "¥176",
    registerStatus: "已确认",
    paymentStatus: "付款已确认",
    seatStatus: "C5, C6",
    action: "查看订单",
  },
  {
    order: "SPR-0007",
    event: events[1].title,
    nickname: "比奇堡miki",
    quantity: 1,
    amount: "¥72",
    registerStatus: "已提交",
    paymentStatus: "待审核",
    seatStatus: "未开放",
    action: "查看审核",
  },
];

const organizerRows = [
  ["RYU-0001", "比奇堡miki", "2", "付款已确认", "C5, C6", "已确认"],
  ["RYU-0002", "月见草", "1", "待审核", "未选座", "已提交"],
  ["RYU-0003", "青柠", "3", "未付款", "未开放", "已提交"],
  ["RYU-0004", "晚风", "1", "付款已确认", "D8", "已确认"],
];

const app = document.querySelector("#app");

function setView(view, options = {}) {
  state.view = view;
  if (options.eventId) state.selectedEventId = options.eventId;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function selectedEvent() {
  return events.find((event) => event.id === state.selectedEventId) || events[0];
}

function statusClass(text) {
  if (text.includes("确认") || text.includes("报名中")) return "open";
  if (text.includes("审核") || text.includes("提交") || text.includes("待")) return "review";
  if (text.includes("驳回") || text.includes("取消")) return "blocked";
  return "done";
}

function eventCard(event) {
  return `
    <article class="event-card clickable">
      <div>
        <div class="event-card-head">
          <span class="tag">${event.type}</span>
          <span class="status ${event.statusClass}">${event.status}</span>
        </div>
        <h3 class="event-title">${event.title}</h3>
        <p class="meta">${event.city} · ${event.date}<br>${event.venue}</p>
      </div>
      <div class="row">
        <strong>${event.price}</strong>
        <span class="meta">剩余 ${event.left} 位</span>
      </div>
      <button class="secondary-button" type="button" data-action="detail" data-event="${event.id}">查看详情</button>
    </article>
  `;
}

function renderSquare() {
  app.innerHTML = `
    <section class="view-header">
      <div>
        <p class="eyebrow">活动广场</p>
        <h1>找到正在招募的线下活动</h1>
        <p class="subtle">公开活动会出现在这里。报名、付款、选座和通知都会保存在同一个订单里。</p>
      </div>
      <button class="primary-button" type="button" data-view="create">创建活动</button>
    </section>

    <section class="filters" aria-label="活动筛选">
      <label class="search">
        <span>⌕</span>
        <input type="search" value="" placeholder="搜索活动、城市或场地" />
      </label>
      <button class="chip active" type="button">全部城市</button>
      <button class="chip" type="button">线下观影</button>
      <button class="chip" type="button">生咖</button>
      <button class="chip" type="button">报名中</button>
    </section>

    <section class="grid three">
      ${events.map(eventCard).join("")}
    </section>
  `;
}

function renderDetail() {
  const event = selectedEvent();
  app.innerHTML = `
    <section class="grid sidebar">
      <article class="hero-panel">
        <div class="event-card-head">
          <span class="tag">${event.type}</span>
          <span class="status ${event.statusClass}">${event.status}</span>
        </div>
        <h1>${event.title}</h1>
        <p class="subtle">${event.city} · ${event.date}<br>${event.venue}</p>
        <div class="grid three" style="margin-top: 22px;">
          <div class="metric-card"><strong>${event.price}</strong><span>单人费用</span></div>
          <div class="metric-card"><strong>${event.left}</strong><span>剩余名额</span></div>
          <div class="metric-card"><strong>${event.multi ? "支持" : "不支持"}</strong><span>多人报名</span></div>
        </div>
      </article>

      <aside class="card">
        <h2>下一步</h2>
        <div class="steps">
          <div class="step"><span class="step-number">1</span><div><strong>登录并报名</strong><p class="meta">提交昵称、联系方式和同行人 ID。</p></div></div>
          <div class="step"><span class="step-number">2</span><div><strong>上传付款截图</strong><p class="meta">订单生成后等待组织者确认。</p></div></div>
          <div class="step"><span class="step-number">3</span><div><strong>付款确认后选座</strong><p class="meta">同一订单可按人数选择座位。</p></div></div>
        </div>
        <button class="primary-button" type="button" data-view="register" style="width:100%; margin-top:18px;">立即报名</button>
      </aside>
    </section>

    <section class="grid two" style="margin-top: 16px;">
      <article class="card">
        <h2>活动说明</h2>
        <p class="subtle">本场为同好组织的线下观影活动，报名成功后请按订单金额付款并上传截图。付款确认后开放选座。</p>
      </article>
      <article class="card">
        <h2>组织者说明</h2>
        <p class="subtle">请使用常用联系方式报名。多人报名需要填写同行人的 GatherUp ID，便于核对订单和历史活动。</p>
      </article>
    </section>
  `;
}

function renderRegister() {
  const event = selectedEvent();
  app.innerHTML = `
    <section class="view-header">
      <div>
        <p class="eyebrow">报名</p>
        <h1>${event.title}</h1>
        <p class="subtle">提交后会生成订单编号，并进入付款截图上传页。</p>
      </div>
    </section>

    <section class="grid sidebar">
      <form class="card form-grid" data-form="register">
        <h2>报名信息</h2>
        <div class="form-grid two">
          <div class="field"><label>昵称</label><input value="比奇堡miki" /></div>
          <div class="field"><label>联系方式</label><input value="WeChat · mikuma" /></div>
        </div>
        <div class="form-grid two">
          <div class="field"><label>人数</label><select><option>2 人</option><option>1 人</option><option>3 人</option></select></div>
          <div class="field"><label>同行人 GatherUp ID</label><input value="GU-TSUKI" /></div>
        </div>
        <div class="field"><label>给组织者的备注</label><textarea>希望尽量安排在中间区域，谢谢。</textarea></div>
        <button class="primary-button" type="submit">提交报名</button>
      </form>

      <aside class="card">
        <h2>报名规则</h2>
        <div class="status-row"><span class="meta">单人费用</span><strong>${event.price}</strong></div>
        <div class="status-row"><span class="meta">每单最多人数</span><strong>${event.multi ? "4 人" : "1 人"}</strong></div>
        <div class="status-row"><span class="meta">候补</span><strong>接受</strong></div>
      </aside>
    </section>
  `;
}

function renderPayment() {
  app.innerHTML = `
    <section class="view-header">
      <div>
        <p class="eyebrow">付款截图</p>
        <h1>订单 RYU-0001</h1>
        <p class="subtle">付款截图提交后，组织者会在付款管理中确认。</p>
      </div>
      <span class="status review">待组织者审核</span>
    </section>

    <section class="grid sidebar">
      <article class="card">
        <h2>付款说明</h2>
        <div class="grid two">
          <div class="metric-card"><strong>¥176</strong><span>应付金额</span></div>
          <div class="metric-card"><strong>2</strong><span>报名人数</span></div>
        </div>
        <p class="subtle" style="margin-top:16px;">请转账至组织者收款码，备注订单编号 RYU-0001。上传截图后等待确认。</p>
      </article>
      <aside class="card">
        <h2>截图</h2>
        <div class="empty">payment-proof-ryu-0001.png</div>
        <button class="secondary-button" type="button" style="width:100%;">重新上传</button>
        <button class="primary-button" type="button" data-view="seat" style="width:100%; margin-top:10px;">模拟确认后选座</button>
      </aside>
    </section>
  `;
}

function renderSeat() {
  const rows = ["A", "B", "C", "D", "E", "F"];
  const assigned = new Set(["B4", "B5", "C7", "D8", "E3"]);
  const blocked = new Set(["A1", "A12", "F1", "F12"]);
  app.innerHTML = `
    <section class="view-header">
      <div>
        <p class="eyebrow">选座</p>
        <h1>订单 RYU-0001</h1>
        <p class="subtle">需选择 2 个座位，当前已选 ${state.selectedSeats.join("、")}。</p>
      </div>
      <button class="primary-button" type="button" data-view="mine">确认选座</button>
    </section>

    <section class="card">
      <div class="chip-list" style="margin-bottom:16px;">
        <span class="chip">可选</span>
        <span class="chip active">已选</span>
        <span class="chip">已被选择</span>
        <span class="chip">不可选</span>
      </div>
      <div class="seat-area">
        <div class="screen">银幕</div>
        <div class="seat-grid">
          ${rows
            .map((row) => `
              <div class="seat-row">
                <span class="seat-label">${row}</span>
                ${Array.from({ length: 12 }, (_, index) => {
                  const label = `${row}${index + 1}`;
                  const cls = state.selectedSeats.includes(label)
                    ? "selected"
                    : assigned.has(label)
                      ? "assigned"
                      : blocked.has(label)
                        ? "blocked"
                        : "";
                  return `<button class="seat ${cls}" type="button" data-seat="${label}">${index + 1}</button>`;
                }).join("")}
              </div>
            `)
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderMine() {
  app.innerHTML = `
    <section class="view-header">
      <div>
        <p class="eyebrow">我的活动</p>
        <h1>待处理事项和历史参与活动</h1>
      </div>
    </section>

    <section class="grid three" style="margin-bottom:16px;">
      <div class="metric-card"><strong>1</strong><span>待审核</span></div>
      <div class="metric-card"><strong>1</strong><span>待选座</span></div>
      <div class="metric-card"><strong>4</strong><span>历史活动</span></div>
    </section>

    <section class="grid">
      ${registrations
        .map((item) => `
          <article class="card row">
            <div>
              <span class="tag">${item.order}</span>
              <h3 style="margin-top:10px;">${item.event}</h3>
              <p class="meta">${item.quantity} 人 · ${item.amount} · ${item.seatStatus}</p>
            </div>
            <div class="chip-list">
              <span class="status ${statusClass(item.paymentStatus)}">${item.paymentStatus}</span>
              <button class="secondary-button" type="button">${item.action}</button>
            </div>
          </article>
        `)
        .join("")}
    </section>
  `;
}

function renderProfile() {
  app.innerHTML = `
    <section class="view-header">
      <div>
        <p class="eyebrow">个人中心</p>
        <h1>比奇堡miki</h1>
        <p class="subtle">GatherUp ID：GU-MIKI · 剩余修改次数 2</p>
      </div>
    </section>
    <section class="grid two">
      <article class="card">
        <h2>账号绑定</h2>
        <div class="status-row"><span>微信</span><span class="status open">已绑定</span></div>
        <div class="status-row"><span>邮箱</span><span class="status open">已绑定</span></div>
        <div class="status-row"><span>手机号</span><span class="status review">待绑定</span></div>
      </article>
      <article class="card">
        <h2>公开 ID</h2>
        <p class="subtle">多人报名时，朋友可以填写你的 GatherUp ID。ID 最多修改两次。</p>
        <button class="secondary-button" type="button" style="margin-top:16px;">修改 ID</button>
      </article>
    </section>
  `;
}

function renderOrganizer() {
  app.innerHTML = `
    <section class="view-header">
      <div>
        <p class="eyebrow">组织工作台</p>
        <h1>需要处理的活动事项</h1>
      </div>
      <button class="primary-button" type="button" data-view="create">创建活动</button>
    </section>

    <section class="grid three" style="margin-bottom:16px;">
      <div class="metric-card"><strong>3</strong><span>待审核付款</span></div>
      <div class="metric-card"><strong>8</strong><span>未选座订单</span></div>
      <div class="metric-card"><strong>2</strong><span>候补报名</span></div>
    </section>

    <section class="table">
      <div class="table-row header"><span>活动</span><span>报名</span><span>付款</span><span>选座</span><span>操作</span></div>
      <div class="table-row">
        <span>${events[0].title}</span><span>42/60</span><span>31 已付</span><span>24 已选</span>
        <button class="secondary-button" type="button" data-view="admin">管理</button>
      </div>
      <div class="table-row">
        <span>${events[1].title}</span><span>26/32</span><span>18 已付</span><span>未开放</span>
        <button class="secondary-button" type="button" data-view="admin">管理</button>
      </div>
    </section>
  `;
}

function renderCreate() {
  app.innerHTML = `
    <section class="view-header">
      <div>
        <p class="eyebrow">创建活动</p>
        <h1>线下观影活动</h1>
      </div>
    </section>

    <section class="grid two">
      <form class="card form-grid">
        <h2>基础信息</h2>
        <div class="field"><label>活动名称</label><input value="《坂本龙一：杰作》线下观影" /></div>
        <div class="form-grid two">
          <div class="field"><label>城市</label><input value="上海" /></div>
          <div class="field"><label>场地</label><input value="百丽宫影城 环贸店" /></div>
        </div>
        <div class="form-grid two">
          <div class="field"><label>日期</label><input value="2026-06-22" /></div>
          <div class="field"><label>时间</label><input value="14:30" /></div>
        </div>
      </form>
      <form class="card form-grid">
        <h2>规则</h2>
        <div class="form-grid two">
          <div class="field"><label>人数上限</label><input value="60" /></div>
          <div class="field"><label>单人费用</label><input value="88" /></div>
        </div>
        <div class="field"><label>多人报名</label><select><option>允许</option><option>不允许</option></select></div>
        <div class="field"><label>订单编号</label><select><option>{eventCode}-0001</option><option>GU-0001</option><option>{eventCode}-{YYYYMMDD}-0001</option></select></div>
        <button class="primary-button" type="button" data-view="admin">发布报名</button>
      </form>
    </section>
  `;
}

function renderAdmin() {
  app.innerHTML = `
    <section class="view-header">
      <div>
        <p class="eyebrow">活动管理台</p>
        <h1>${events[0].title}</h1>
        <p class="subtle">报名中 · 上海 · 6月22日 周六 14:30</p>
      </div>
      <button class="secondary-button" type="button">复制链接</button>
    </section>

    <section class="grid three" style="margin-bottom:16px;">
      <div class="metric-card"><strong>42</strong><span>总报名</span></div>
      <div class="metric-card"><strong>31</strong><span>已付款</span></div>
      <div class="metric-card"><strong>24</strong><span>已选座</span></div>
    </section>

    <section class="card">
      <div class="section-head">
        <h2>报名与付款</h2>
        <div class="segmented"><button class="active" type="button">报名</button><button type="button">付款</button><button type="button">座位</button></div>
      </div>
      <div class="table">
        <div class="table-row header"><span>订单</span><span>昵称</span><span>人数</span><span>付款</span><span>座位</span><span>操作</span></div>
        ${organizerRows
          .map((row) => `
            <div class="table-row">
              <span>${row[0]}</span><span>${row[1]}</span><span>${row[2]}</span>
              <span class="status ${statusClass(row[3])}">${row[3]}</span><span>${row[4]}</span>
              <button class="secondary-button" type="button">${row[3] === "待审核" ? "确认付款" : "查看"}</button>
            </div>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function render() {
  const views = {
    square: renderSquare,
    detail: renderDetail,
    register: renderRegister,
    payment: renderPayment,
    seat: renderSeat,
    mine: renderMine,
    profile: renderProfile,
    organizer: renderOrganizer,
    create: renderCreate,
    admin: renderAdmin,
  };
  (views[state.view] || renderSquare)();
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    setView(viewButton.dataset.view);
    return;
  }

  const detailButton = event.target.closest("[data-action='detail']");
  if (detailButton) {
    setView("detail", { eventId: detailButton.dataset.event });
    return;
  }

  const seatButton = event.target.closest("[data-seat]");
  if (seatButton && !seatButton.classList.contains("assigned") && !seatButton.classList.contains("blocked")) {
    const label = seatButton.dataset.seat;
    if (state.selectedSeats.includes(label)) {
      state.selectedSeats = state.selectedSeats.filter((seat) => seat !== label);
    } else if (state.selectedSeats.length < 2) {
      state.selectedSeats = [...state.selectedSeats, label];
    }
    renderSeat();
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.matches("[data-form='register']")) {
    event.preventDefault();
    setView("payment");
  }
});

render();
