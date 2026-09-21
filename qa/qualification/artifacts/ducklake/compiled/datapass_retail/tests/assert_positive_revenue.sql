-- dbt singular tests return failing rows. Zero rows means pass.
select *
from "lake"."warehouse"."fct_sales"
where revenue <= 0 or revenue is null