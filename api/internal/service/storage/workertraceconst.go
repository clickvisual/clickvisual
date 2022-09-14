package storage

const (
	batchInsertSize = 5000
)

const queryJaegerCallCountSql = `with toDateTime('%s') as end_time
select 
	timestamp,
	parent,
	child,
	call_count,
	server_duration_p50,
	server_duration_p90,
	server_duration_p99,
	client_duration_p50,
	client_duration_p90,
	client_duration_p99,
	server_success_rate,
	client_success_rate,
	time
from
(select
	toStartOfHour(end_time) as timestamp,
	parent_service_name as parent,
	service_name as child,
	count(*) as call_count,
	server_duration_all[1] as server_duration_p50,
	server_duration_all[2] as server_duration_p90,
	server_duration_all[3] as server_duration_p99,
	client_duration_all[1] as client_duration_p50,
	client_duration_all[2] as client_duration_p90,
	client_duration_all[3] as client_duration_p99,
	sum(server_success)/count(*) as server_success_rate,
	sum(client_success)/count(*) as client_success_rate,
	now() as time,
	quantiles(0.5,0.9,0.99)(server_duration) as server_duration_all,
	quantiles(0.5,0.9,0.99)(client_duration) as client_duration_all
from
	(
	select
		c.span_id,
		c.trace_id,
		c.service_name,
		c.parent_span_id,
		p.service_name as parent_service_name,
		c.span_kind,
		c.duration as server_duration,
		p.duration as client_duration,
		c.success as server_success,
		p.success as client_success
	from
		(SELECT
        traceID AS trace_id,
        timestamp AS time,
        JSONExtractString(model, 'span_id') AS span_id,
        JSONExtractUInt(model, 'duration') AS duration,
        JSONExtractString(JSONExtractRaw(model, 'process'), 'service_name') AS service_name,
		 		JSONExtractString(references[1], 'span_id') as parent_span_id, 
				tag_values[indexOf(tag_keys,'span.kind')] AS span_kind,
				if(tag_values[indexOf(tag_keys,'otel.status_code')]=='ERROR', 0, 1) AS success,
				arrayMap(x -> (x[1]),event_tag) AS tag_keys,
				arrayMap(x -> (x[2]),event_tag) AS tag_values,
				arrayMap(x -> [JSONExtractString(x, 'key'), coalesce(JSONExtractString(x,'v_str'), JSONExtractString(x,'v_int64'),'')],JSONExtractArrayRaw(model,'tags')) AS event_tag,
		 		JSONExtract(model, 'references', 'Array(String)') as references
    FROM %s where span_kind in ('server','server.unary','server.stream') and timestamp >= toStartOfHour(end_time) and timestamp < (toStartOfHour(end_time) + interval 1 hour)) c
	global join 
		(SELECT
        traceID AS trace_id,
        timestamp AS time,
        JSONExtractUInt(model, 'duration') AS duration,
        JSONExtractString(model, 'span_id') AS span_id,
        JSONExtractString(JSONExtractRaw(model, 'process'), 'service_name') AS service_name,
				tag_values[indexOf(tag_keys,'span.kind')] AS span_kind,
				if(tag_values[indexOf(tag_keys,'otel.status_code')]=='ERROR', 0, 1) AS success,
				arrayMap(x -> (x[1]),event_tag) AS tag_keys,
				arrayMap(x -> (x[2]),event_tag) AS tag_values,
				arrayMap(x -> [JSONExtractString(x, 'key'), coalesce(JSONExtractString(x,'v_str'), JSONExtractString(x,'v_int64'),'')],JSONExtractArrayRaw(model,'tags')) AS event_tag
		FROM %s where span_kind in ('client') and timestamp >= (toStartOfHour(end_time) - interval 1 hour) and timestamp < (toStartOfHour(end_time) + interval 1 hour)) p on
		c.trace_id = p.trace_id
		and c.parent_span_id = p.span_id) f
	where service_name <>'' and parent_service_name <>''
	group by
		service_name,
		parent_service_name) f2`
