// Cloudflare Pages Function: 代理 GLM 多模态 API 识别账单截图
// 部署后访问地址：https://xxx.pages.dev/api/bill-recognize

interface Env {
  GLM_API_KEY: string;
}

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MODEL = 'glm-4v-plus';

const SYSTEM_PROMPT = `你是一个专门识别中国旅游账单截图的 AI 助手。你的任务是从账单/记账 App 截图/Excel 表格截图中精确提取消费记录。

## 任务
识别图片中所有消费记录，每条提取以下字段：
- purpose：消费目的（必须是以下之一：餐饮、住宿、交通、门票、购物、其他）
- amount：金额（数字，不含¥符号，保留小数）
- note：备注（可选，简短描述如"机场晚餐""酒店押金"）
- date：日期（格式 YYYY-MM-DD，如果图中有）
- payer_name：付款人姓名（如果能从截图中看出谁付的款就填，否则留空字符串 ""）

## 消费目的判断规则
- 餐饮：吃饭、餐厅、外卖、零食、饮料、咖啡
- 住宿：酒店、民宿、客栈、房费
- 交通：打车、地铁、公交、机票、火车票、租车、停车费
- 门票：景区门票、演出票、游乐场
- 购物：纪念品、特产、日用品
- 其他：无法归类的

## 付款人识别规则
- 如果截图中有"付款人""支付人""付款方""谁付的"等字段，提取对应姓名
- 如果是微信群收款截图，发起人通常是付款人
- 如果看不出付款人，payer_name 留空字符串 ""
- 不要编造姓名，只提取图中明确显示的付款人

## 输出格式
返回 JSON 数组，不要 markdown 代码块，不要解释：
[
  {"purpose":"餐饮","amount":128.5,"note":"机场晚餐","date":"2025-07-21","payer_name":"小明"},
  {"purpose":"交通","amount":45,"note":"打车","date":"2025-07-21","payer_name":""}
]

## 注意
- 只返回能**清晰辨认**的消费记录，模糊的跳过
- amount 必须是数字（如 128.5），不要带¥符号
- 如果没有日期信息，date 留空字符串 ""
- 如果没有付款人信息，payer_name 留空字符串 ""
- 如果整张图无法识别或不是账单，返回空数组 []
- Excel 表格截图：按行识别，每行一条消费
- 记账 App 截图：按列表项识别`;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function onRequest(context: { request: Request; env: Env }) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (context.request.method !== 'POST') {
    return jsonError('请使用 POST 方法', 405);
  }

  const apiKey = context.env.GLM_API_KEY;
  if (!apiKey) {
    return jsonError('GLM_API_KEY 环境变量未设置，请在 Cloudflare Pages 后台配置', 500);
  }

  try {
    const body = await context.request.json() as { image?: string };
    if (!body.image) {
      return jsonError('请提供 image 字段（base64 图片数据）', 400);
    }

    if (body.image.length > MAX_IMAGE_SIZE) {
      return jsonError(`图片过大（${(body.image.length / 1024 / 1024).toFixed(1)}MB），请压缩到 5MB 以内`, 413);
    }

    const glmResponse = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: body.image },
              },
              {
                type: 'text',
                text: '请识别这张账单截图中的所有消费记录，返回 JSON 数组。每条包含 purpose/amount/note/date 字段。',
              },
            ],
          },
        ],
        temperature: 0.05,
        max_tokens: 2048,
      }),
    });

    if (!glmResponse.ok) {
      return jsonError(`识别服务暂不可用 (${glmResponse.status})`, 502);
    }

    const glmData = await glmResponse.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawContent = glmData.choices?.[0]?.message?.content;
    if (!rawContent) {
      return jsonError('AI 未返回有效内容，请重试', 502);
    }

    // 解析 JSON
    let jsonStr = rawContent.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();

    let items: Array<{ purpose: string; amount: number; note: string; date: string }>;
    try {
      const parsed = JSON.parse(jsonStr);
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      items = [];
    }

    // 清洗数据
    const validPurposes = ['餐饮', '住宿', '交通', '门票', '购物', '其他'];
    const cleanedItems = items
      .map((item) => ({
        purpose: validPurposes.includes(item.purpose) ? item.purpose : '其他',
        amount: Math.round(Number(item.amount) * 100) / 100 || 0,
        note: String(item.note || '').slice(0, 30),
        date: String(item.date || ''),
      }))
      .filter((item) => item.amount > 0);

    return new Response(JSON.stringify({ items: cleanedItems, rawText: rawContent.slice(0, 500) }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : '未知错误', 500);
  }
}

function jsonError(error: string, status = 400): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
