select
    service_date as metric_date,
    count(*) as trips,
    sum(total_amount) as revenue,
    avg(fare_amount) as avg_fare,
    avg(date_diff('minute', pickup_datetime, dropoff_datetime)) as avg_duration_minutes,
    current_timestamp as refreshed_at
from {{ ref('stg_trips') }}
group by 1
