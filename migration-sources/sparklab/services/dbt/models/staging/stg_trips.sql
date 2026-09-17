with source as (
    select * from {{ source('silver', 'trips') }}
)
select
    vendor_id,
    pickup_datetime,
    dropoff_datetime,
    pickup_zone_id,
    dropoff_zone_id,
    payment_type,
    fare_amount,
    total_amount,
    service_date,
    trip_sequence
from source
