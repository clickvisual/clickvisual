# Instructions

ClickHouse native Where clause syntax used in the log query criteria filter section.

[Official documents](https://clickhouse.com/docs/en/sql-reference/statements/select/where)

## Ask Log Troubleshooting (v2)

The ClickVisual home page, `/v2`, and the default destination after login open Ask (`/v2/ask`). You can also open it from **Logs → Ask** and enter a service name, Trace ID, or error. Continue the conversation in the composer at the bottom. Use **History** to switch saved conversations and **New Conversation** to start another investigation. Example questions fill the composer; they run only after you send them. Administrators must configure a model in **Model Configuration** first. The query-only private-lite edition still opens the query page by default.

Saved conversations include `sessionId` in the URL, for example `/v2/ask?sessionId=123`. Refreshing or opening that address restores the conversation, and browser back/forward navigation switches conversations accordingly. Access still requires permission. **New Conversation** removes `sessionId`; opening Ask without it shows an empty conversation. The existing `/query` entry still redirects to `/v2/query`, preserving log query parameters.

History sits at the far left, and the conversation fills the remaining workspace. Search by conversation title and see when each conversation was last updated. Hover over a truncated title to read it in full. The sidebar starts expanded on desktop and collapsed on mobile. Use its toggle to expand or collapse it, or press Esc to collapse it and return focus to the toggle. The share action is at the bottom of the sidebar.

Conversations are stored separately for each signed-in user. Changing `sessionId` cannot grant another user access to read, reply, confirm queries, or generate share links. AI table discovery, field inspection, and queries use the current user's log query permissions. Opening history, continuing an analysis, and confirming a query recheck permissions for the tables referenced by that conversation. Revoking access prevents reading its contents or reusing its log evidence as model context.

Ask filters support comparisons against fields in the current table, `LIKE`, `IN`, and `IS NULL`, joined with `AND` or `OR`, plus single-keyword searches. Functions, subqueries, SQL comments, and full SQL statements are rejected to prevent bypassing table permissions.

Ask displays answers as a conversation and hides intermediate tool steps. Query results include up to eight log samples directly in the answer, with an explicit notice when long content is truncated. Samples do not represent the full result set. For a full query, **Open in Query Page** carries the table, conditions, and time range into the query workbench. Follow-up requests for details reuse the existing query information. Switching tables or expanding to a time range longer than six hours requires confirmation.

Model Configuration supports OpenAI-compatible Chat Completions, OpenAI Responses, and Anthropic protocols. Select **OpenAI Responses** for gateways using the Responses API. API keys are stored on the backend, and the page only shows their configured status. Leave the key blank when editing to preserve it. Ask uses enabled backend models to analyze log evidence, possible causes, and next steps, and states any limits when evidence is insufficient.

**Copy Share Link** creates a read-only link at `/v2/ask/share/:token`. Viewers must sign in and have query permission for every table referenced in the conversation, including earlier log evidence, table listings, and field descriptions, not just the final query. A share link does not grant log access and cannot be used to reply or confirm queries. The previous `/v2/troubleshoot` and `/v2/troubleshoot/share/:token` links continue to work. Add your deployment prefix to these paths when hosting under a subpath.

## Use cases after migration from Alibaba cloud

For example,we used to use  Alibaba cloud's fuzzy matching to search.The following statement will perform fuzzy matching on these two conditions.

`Electron and docs_text_copy`

So how to use it in ClickVisual? By default(establish a complete set of data collection process through clickVisual),use the following statement instead.

`_raw_log_ like '%Electron%' and _raw_log_ like '%docs_text_copy%'`

However, this performance is not very good,you can add Analysis fields to improve query efficiency.
Suppose that the target field we match is in a nested JSON: browserName and code field in body as shown below

![img_2.png](../../../images/inst-3.png)

If you see the following config in Analysis panel on the left,you can directly use  the following statement to query.

`body.browserName='browserName' and body.code='docs_text_copy'`

![img_1.png](../../../images/inst-5.png)

If there is no any Analysis field,you need to configure.

![img_2.png](../../../images/inst-3.png)
![img_1.png](../../../images/inst-2.png)

After configuration, the query statement is:

`body.browserName='browserName' and body.code='docs_text_copy'`

If the query is still slow in this case,you can configure that:set siphash and urlhash(truncate parameters after '?'and hash).By establishing hash mapping, query efficiency is improved.

![img_3.png](../../../images/inst-4.png)

The query statement is still:

`body.browserName='browserName' and body.code='docs_text_copy'`
