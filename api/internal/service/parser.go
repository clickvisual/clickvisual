package service

// select concat(formatDateTime(_time_second_,'%Y-%m-%d %H'),':00') as hour,
//       count(1) as pv,
//       status
// from ingress_stdout
// where toDate(_time_second_) = toDate(now())
// and status is not null
// group by hour,status
// order by hour;
