declare module "china-area-data" {
  /**
   * 中国行政区划数据。
   *
   * 结构：`{ [code]: { [childCode]: name } }`
   *
   * - `data["86"]` → 省份列表（`{ "110000": "北京市", "130000": "河北省", ... }`）
   * - `data["130000"]` → 河北省下的城市列表
   * - `data["130100"]` → 石家庄市下的区县列表
   */
  const data: Record<string, Record<string, string>>
  export default data
}
