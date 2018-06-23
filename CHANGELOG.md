---------------------------------------------------------------------
FinChain stage2 2018-06-23
---------------------------------------------------------------------
New features
--------
- 总价模式和单价模式共用support_asset结构
- 总价模式增加base_price
- soft_top, hard_top置于accepts内
- 时间选择到秒
- early_bird_percent变为数组，early_bird_percent ::= {time, percent}*

Bug fixes
--------
- 总价模式精度
- 单价模式增加新资产报错
— 提交amount未考虑精度
- 早鸟计划无法提交数据
