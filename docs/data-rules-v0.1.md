# GatherUp v0.1 数据模型与业务规则

## 1. 目标

这份文档用于把 GatherUp v0.1 的核心对象和规则定清楚，方便后续进入开发。

v0.1 的核心闭环是：

用户登录 → 浏览/创建活动 → 报名生成订单 → 上传付款截图 → 组织者确认付款 → 参与者选座 → 查看历史活动/导出名单。

## 2. 核心对象关系

主要对象：

- 用户 `users`
- 活动 `events`
- 报名/订单 `registrations`
- 同行人 `registration_attendees`
- 付款记录 `payments`
- 座位 `seats`
- 座位分配 `seat_assignments`
- 通知 `announcements`

关系概览：

- 一个用户可以创建多个活动。
- 一个活动属于一个组织者。
- 一个活动可以有多条报名。
- 一条报名属于一个活动和一个主报名用户。
- 一条报名生成一个订单编号。
- 一条报名对应一条付款记录。
- 一条报名可以包含一个或多个同行人记录。
- 一个同行人可以被分配一个座位。
- 一个座位在同一活动中最多只能被分配给一个同行人。
- 一个活动可以发布多条通知。

## 3. 用户模型

### `users`

字段：

- `id`
- `public_id`
- `public_id_change_count`
- `name`
- `avatar_url`
- `email`
- `phone`
- `wechat_openid`
- `preferred_locale`
- `created_at`
- `updated_at`

### `user_auth_identities`

字段：

- `id`
- `user_id`
- `provider`
- `provider_user_id`
- `email`
- `phone`
- `display_name`
- `avatar_url`
- `is_primary`
- `verified_at`
- `last_sign_in_at`
- `metadata`
- `created_at`
- `updated_at`

### 规则

- 每个用户必须有唯一的 `public_id`。
- `public_id` 用于多人报名时填写同行人。
- `public_id` 最多允许修改两次。
- `public_id_change_count` 记录已修改次数。
- 修改次数达到 2 后，不允许继续修改。
- `users.id` 是 GatherUp 的永久用户 ID。
- 邮箱、Google、Apple、手机号、微信等登录方式统一记录在 `user_auth_identities`。
- 邮箱是全球账号底座，微信是中国区增强入口。
- 同一个登录身份不能绑定多个用户。
- 一个用户可以绑定多个登录身份。

### 待确认

- 同行人 ID 是否必须对应已注册用户。
- 如果同行人尚未注册，是否允许先填写 ID 或手机号后邀请绑定。

## 4. 活动模型

### `events`

字段：

- `id`
- `organizer_id`
- `name`
- `category`
- `template`
- `custom_type_label`
- `city`
- `venue_name`
- `address`
- `starts_at`
- `registration_deadline`
- `capacity`
- `price_cents`
- `currency`
- `description`
- `payment_instructions`
- `organizer_note`
- `visibility`
- `allow_multi_person_registration`
- `max_people_per_registration`
- `accept_waitlist`
- `order_number_format`
- `order_number_prefix`
- `status`
- `created_at`
- `updated_at`

### 活动场景

v0.1 建议先支持：

- `community`：同好活动。
- `campus`：校园活动。
- `conference`：会议会务。
- `private`：好友聚会。
- `workshop`：工作坊。
- `market`：快闪/市集。

### 流程模板

- `basic_registration`：基础报名。
- `payment_registration`：报名收款。
- `seating`：选座活动。
- `checkin`：签到活动。
- `time_slot`：分时预约。
- `record_only`：记录型聚会。

线下观影、生咖、校园讲座、官方会议、好友聚餐等不应作为唯一固定枚举，而应作为 `custom_type_label` 或场景 + 模板组合呈现。

### 可见性

- `public`：进入活动广场。
- `unlisted`：仅链接可见。

### 活动状态

- `draft`：草稿。
- `registration`：报名中。
- `payment`：付款确认中。
- `seating`：选座中。
- `confirmed`：已成团/已确认。
- `finished`：已结束。
- `cancelled`：已取消。

### 规则

- 只有组织者可以编辑自己创建的活动。
- 活动发布后才可以被参与者报名。
- `public` 活动进入活动广场。
- `unlisted` 活动不进入活动广场，但可以通过链接访问。
- 活动人数上限由 `capacity` 控制。
- 已确认报名人数达到 `capacity` 后，如果活动接受候补，新报名进入候补；否则停止报名。
- 如果不允许多人报名，`max_people_per_registration` 应为 1。
- 如果允许多人报名，`max_people_per_registration` 不能小于 2。
- 订单编号格式由组织者选择。

## 5. 报名/订单模型

### `registrations`

字段：

- `id`
- `event_id`
- `user_id`
- `order_number`
- `nickname`
- `contact_type`
- `contact_value`
- `quantity`
- `amount_due_cents`
- `status`
- `accepts_waitlist`
- `participant_note`
- `organizer_note`
- `created_at`
- `updated_at`

### 报名状态

- `pending`：报名已提交，等待处理。
- `confirmed`：报名已确认。
- `waitlisted`：候补。
- `cancelled`：已取消。

### 规则

- 参与者必须登录后才能报名。
- 同一个用户是否可以对同一个活动提交多条报名，v0.1 先默认不允许。
- 每条报名必须生成一个唯一订单编号。
- 订单编号在同一活动内唯一。
- `amount_due_cents = quantity * event.price_cents`。
- 不允许多人报名时，`quantity` 固定为 1。
- 允许多人报名时，`quantity` 必须在 1 到 `max_people_per_registration` 之间。
- `quantity` 不能超过活动剩余名额，除非报名进入候补。
- 报名取消后，关联座位应释放。
- 报名取消后，付款状态是否自动退款由后续退款流程处理；v0.1 可先只标记取消。

## 6. 同行人模型

### `registration_attendees`

字段：

- `id`
- `registration_id`
- `user_id`
- `public_id`
- `display_name`
- `is_primary`
- `created_at`
- `updated_at`

### 规则

- 每条报名至少有一个同行人记录。
- 主报名人也应写入 `registration_attendees`，并标记 `is_primary = true`。
- 同行人数必须等于报名 `quantity`。
- 多人报名时，除主报名人外，需要记录其他同行人的 GatherUp ID。
- 如果同行人 ID 必须对应注册用户，则 `public_id` 应能匹配到 `users.public_id`。
- 如果未来允许未注册同行人，`user_id` 可以为空，但 `public_id` 或邀请状态需要另行设计。

## 7. 付款模型

### `payments`

字段：

- `id`
- `registration_id`
- `order_number`
- `amount_cents`
- `status`
- `proof_url`
- `submitted_at`
- `confirmed_at`
- `reviewed_by`
- `organizer_note`
- `created_at`
- `updated_at`

### 付款状态

- `unpaid`：未上传截图。
- `submitted`：已上传截图，等待审核。
- `confirmed`：付款已确认。
- `rejected`：付款截图被驳回。
- `refunded`：已退款。

### 规则

- v0.1 不接入官方支付。
- 报名创建后自动创建付款记录，初始状态为 `unpaid`。
- 参与者上传付款截图后，状态变为 `submitted`。
- 只有活动组织者可以确认或驳回付款。
- 付款确认后，状态变为 `confirmed`，并记录 `confirmed_at` 和 `reviewed_by`。
- 付款驳回后，参与者可以重新上传截图。
- 只有付款状态为 `confirmed` 的报名可以进入选座。
- 如果报名取消且已付款，v0.1 可先由组织者手动标记 `refunded`。

## 8. 座位模型

### `seats`

字段：

- `id`
- `event_id`
- `row_label`
- `seat_number`
- `display_label`
- `status`
- `created_at`
- `updated_at`

### 座位状态

- `available`：可选。
- `held`：临时占用。
- `assigned`：已分配。
- `blocked`：不可选。

### `seat_assignments`

字段：

- `id`
- `event_id`
- `registration_id`
- `attendee_id`
- `order_number`
- `seat_id`
- `created_at`

### 规则

- v0.1 座位图由组织者输入排数和每排座位数生成。
- 一个座位在一个活动中最多只能有一条有效分配。
- 只有 `available` 座位可以被参与者选择。
- `blocked` 座位不能被选择。
- 一个报名需要选择的座位数必须等于 `quantity`。
- 每个同行人最多分配一个座位。
- 付款未确认时，不能创建座位分配。
- 报名取消时，应释放该报名的座位分配。
- 组织者可以手动调整座位，但系统必须避免同一个座位被重复分配。

## 9. 通知模型

### `announcements`

字段：

- `id`
- `event_id`
- `title`
- `body`
- `status`
- `published_at`
- `created_at`
- `updated_at`

### 通知状态

- `draft`：草稿。
- `published`：已发布。

### 规则

- 只有活动组织者可以创建、编辑、发布通知。
- 参与者只能看到已发布通知。
- 通知可复制为群聊文案。

## 10. 订单编号规则

### v0.1 可选模板

建议第一版提供 4 种：

- `GU-0001`
- `{eventCode}-0001`
- `{eventCode}-{YYYYMMDD}-0001`
- 自定义前缀 + 流水号

### 规则

- 订单编号由系统生成，组织者选择格式。
- 订单编号在同一活动内唯一。
- 流水号从 1 开始。
- 流水号按报名创建顺序递增。
- 已取消订单不回收编号。
- 订单编号应出现在参与者状态页、付款页、组织者列表和导出文件中。

## 11. 历史活动规则

参与者登录后可以查看自己历史参与过的活动。

纳入历史活动的记录：

- 已报名。
- 候补中。
- 已付款。
- 已选座。
- 已结束。
- 已取消。

我的活动分组：

- 待付款。
- 待审核。
- 待选座。
- 即将开始。
- 已结束。
- 已取消。

## 12. 权限规则

### 未登录用户

- 可以浏览活动广场。
- 可以查看公开活动详情。
- 不能报名。
- 不能上传付款截图。
- 不能选座。

### 参与者

- 可以报名公开或链接可见活动。
- 可以查看自己的报名和历史活动。
- 可以上传自己的付款截图。
- 可以在付款确认后为自己的订单选座。
- 不能查看其他人的付款截图。
- 不能修改他人的报名。

### 组织者

- 可以创建活动。
- 可以管理自己创建的活动。
- 可以查看本活动报名、付款、座位、通知和导出。
- 可以确认或驳回付款。
- 可以调整座位。
- 不能管理其他组织者创建的活动。

## 13. v0.1 暂不处理

- 官方支付接入。
- 自动退款。
- 复杂票种。
- 优惠码。
- 活动评论。
- 关注组织者。
- 个性化推荐。
- 复杂影院座位图导入。
- 多管理员细粒度权限。
