# NYC Taxi Operations

The Evidence layer is intentionally a thin consumer of Gold. It demonstrates
that the engineered data product is useful and fresh; it is not a second BI
training application.

```sql daily
select *
from gold.daily_metrics
order by metric_date desc
```

<BigValue data={daily} value=revenue title="Revenue" fmt=usd />
<BigValue data={daily} value=trips title="Trips" fmt=num0 />
<BigValue data={daily} value=avg_fare title="Average Fare" fmt=usd />

<LineChart
  data={daily}
  x=metric_date
  y=revenue
  title="Daily Revenue"
/>
