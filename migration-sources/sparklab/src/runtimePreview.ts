export const runtimePreview = {
  "profiles": {
    "generic_8x8": {
      "baseline": {
        "duration_s": 18.089,
        "core_hours": 0.3417,
        "worker_core_hours": 0.3216,
        "driver_core_hours": 0.0201,
        "task_core_hours": 0.2669,
        "cluster_utilization_pct": 83.0,
        "memory_gb_hours": 2.6531,
        "driver_memory_gb_hours": 0.0804,
        "node_hours": 0.0452,
        "worker_node_hours": 0.0402,
        "shuffle_gb": 52.806,
        "spill_gb": 0.0,
        "plan_decision": {
          "initial_join": "SortMergeJoin",
          "final_join": "SortMergeJoin",
          "reason": "no broadcast hint and no catalog size statistics in this calibrated scenario",
          "join_shuffle_avoided": false
        },
        "cost": {
          "sparklab": {
            "scc": 3.035,
            "eur_per_scc": 0.1,
            "estimated_eur": 0.304,
            "label": "SparkLab training price"
          },
          "fabric_like": {
            "cu_hours": null,
            "price_input_eur_per_cu_hour": null,
            "estimated_eur": null,
            "label": "Fabric-equivalent usage estimate; not an Azure invoice"
          },
          "databricks_like": {
            "dbu_equivalent": null,
            "price_input_usd_per_dbu": null,
            "estimated_usd": null,
            "label": "DBU-equivalent teaching adapter; use dated vendor list price for money"
          }
        },
        "stages": [
          {
            "id": 1,
            "name": "Parquet scan + filter",
            "tasks": 286,
            "workers": 8,
            "slots": 64,
            "duration_s": 3.711,
            "spill_gb": 0.0,
            "max_task_s": 1.016,
            "p50_task_s": 0.718,
            "p95_task_s": 0.875,
            "max_partition_mb": 151.237,
            "skewed_tasks": 0,
            "notes": []
          },
          {
            "id": 2,
            "name": "SortMergeJoin + Exchange",
            "tasks": 225,
            "workers": 8,
            "slots": 64,
            "duration_s": 7.56,
            "spill_gb": 0.0,
            "max_task_s": 2.918,
            "p50_task_s": 1.308,
            "p95_task_s": 2.821,
            "max_partition_mb": 209.823,
            "skewed_tasks": 0,
            "notes": [
              "AQE split 1656 MB skewed partition into 26 ~64 MB tasks",
              "Catalog statistics are intentionally unavailable in this exercise; no static auto-broadcast"
            ]
          },
          {
            "id": 3,
            "name": "Exchange + HashAggregate(customer_id)",
            "tasks": 225,
            "workers": 8,
            "slots": 64,
            "duration_s": 6.818,
            "spill_gb": 0.0,
            "max_task_s": 2.618,
            "p50_task_s": 1.187,
            "p95_task_s": 2.532,
            "max_partition_mb": 209.823,
            "skewed_tasks": 0,
            "notes": [
              "AQE split 1656 MB skewed partition into 26 ~64 MB tasks"
            ]
          }
        ]
      },
      "optimized": {
        "duration_s": 14.371,
        "core_hours": 0.2715,
        "worker_core_hours": 0.2555,
        "driver_core_hours": 0.016,
        "task_core_hours": 0.2155,
        "cluster_utilization_pct": 84.4,
        "memory_gb_hours": 2.1077,
        "driver_memory_gb_hours": 0.0639,
        "node_hours": 0.0359,
        "worker_node_hours": 0.0319,
        "shuffle_gb": 26.4,
        "spill_gb": 0.0,
        "plan_decision": {
          "initial_join": "BroadcastHashJoin",
          "final_join": "BroadcastHashJoin",
          "reason": "explicit broadcast hint",
          "join_shuffle_avoided": true
        },
        "cost": {
          "sparklab": {
            "scc": 1.634,
            "eur_per_scc": 0.1,
            "estimated_eur": 0.163,
            "label": "SparkLab training price"
          },
          "fabric_like": {
            "cu_hours": null,
            "price_input_eur_per_cu_hour": null,
            "estimated_eur": null,
            "label": "Fabric-equivalent usage estimate; not an Azure invoice"
          },
          "databricks_like": {
            "dbu_equivalent": null,
            "price_input_usd_per_dbu": null,
            "estimated_usd": null,
            "label": "DBU-equivalent teaching adapter; use dated vendor list price for money"
          }
        },
        "stages": [
          {
            "id": 1,
            "name": "Parquet scan + filter",
            "tasks": 286,
            "workers": 8,
            "slots": 64,
            "duration_s": 3.711,
            "spill_gb": 0.0,
            "max_task_s": 1.016,
            "p50_task_s": 0.718,
            "p95_task_s": 0.875,
            "max_partition_mb": 151.237,
            "skewed_tasks": 0,
            "notes": []
          },
          {
            "id": 2,
            "name": "BroadcastHashJoin",
            "tasks": 286,
            "workers": 8,
            "slots": 64,
            "duration_s": 3.842,
            "spill_gb": 0.0,
            "max_task_s": 1.056,
            "p50_task_s": 0.742,
            "p95_task_s": 0.907,
            "max_partition_mb": 151.237,
            "skewed_tasks": 0,
            "notes": [
              "Explicit broadcast build side: 6.4 MB; fact-side join shuffle avoided"
            ]
          },
          {
            "id": 3,
            "name": "Exchange + HashAggregate(customer_id)",
            "tasks": 225,
            "workers": 8,
            "slots": 64,
            "duration_s": 6.818,
            "spill_gb": 0.0,
            "max_task_s": 2.618,
            "p50_task_s": 1.187,
            "p95_task_s": 2.532,
            "max_partition_mb": 209.823,
            "skewed_tasks": 0,
            "notes": [
              "AQE split 1656 MB skewed partition into 26 ~64 MB tasks"
            ]
          }
        ]
      },
      "skew": {
        "duration_s": 10.529,
        "core_hours": 0.1989,
        "worker_core_hours": 0.1872,
        "driver_core_hours": 0.0117,
        "task_core_hours": 0.1566,
        "cluster_utilization_pct": 83.6,
        "memory_gb_hours": 1.5443,
        "driver_memory_gb_hours": 0.0468,
        "node_hours": 0.0263,
        "worker_node_hours": 0.0234,
        "shuffle_gb": 26.4,
        "spill_gb": 0.0,
        "plan_decision": {
          "initial_join": null,
          "final_join": null,
          "reason": "aggregation-only skew exercise",
          "join_shuffle_avoided": null,
          "aqe_skew_split": true
        },
        "cost": {
          "sparklab": {
            "scc": 1.55,
            "eur_per_scc": 0.1,
            "estimated_eur": 0.155,
            "label": "SparkLab training price"
          },
          "fabric_like": {
            "cu_hours": null,
            "price_input_eur_per_cu_hour": null,
            "estimated_eur": null,
            "label": "Fabric-equivalent usage estimate; not an Azure invoice"
          },
          "databricks_like": {
            "dbu_equivalent": null,
            "price_input_usd_per_dbu": null,
            "estimated_usd": null,
            "label": "DBU-equivalent teaching adapter; use dated vendor list price for money"
          }
        },
        "stages": [
          {
            "id": 1,
            "name": "Parquet scan + filter",
            "tasks": 286,
            "workers": 8,
            "slots": 64,
            "duration_s": 3.711,
            "spill_gb": 0.0,
            "max_task_s": 1.016,
            "p50_task_s": 0.718,
            "p95_task_s": 0.875,
            "max_partition_mb": 151.237,
            "skewed_tasks": 0,
            "notes": []
          },
          {
            "id": 2,
            "name": "Exchange + HashAggregate(customer_id)",
            "tasks": 225,
            "workers": 8,
            "slots": 64,
            "duration_s": 6.818,
            "spill_gb": 0.0,
            "max_task_s": 2.618,
            "p50_task_s": 1.187,
            "p95_task_s": 2.532,
            "max_partition_mb": 209.823,
            "skewed_tasks": 0,
            "notes": [
              "AQE split 1656 MB skewed partition into 26 ~64 MB tasks",
              "Known hot key: CORPORATE_ACCOUNT_01"
            ]
          }
        ]
      }
    },
    "fabric_f64_like": {
      "baseline": {
        "duration_s": 15.479,
        "core_hours": 0.3883,
        "worker_core_hours": 0.3539,
        "driver_core_hours": 0.0344,
        "task_core_hours": 0.2403,
        "cluster_utilization_pct": 67.9,
        "memory_gb_hours": 3.1067,
        "driver_memory_gb_hours": 0.2752,
        "node_hours": 0.0485,
        "worker_node_hours": 0.0442,
        "shuffle_gb": 52.806,
        "spill_gb": 0.0,
        "plan_decision": {
          "initial_join": "SortMergeJoin",
          "final_join": "SortMergeJoin",
          "reason": "no broadcast hint and no catalog size statistics in this calibrated scenario",
          "join_shuffle_avoided": false
        },
        "cost": {
          "sparklab": {
            "scc": 3.091,
            "eur_per_scc": 0.1,
            "estimated_eur": 0.309,
            "label": "SparkLab training price"
          },
          "fabric_like": {
            "cu_hours": 0.1941,
            "price_input_eur_per_cu_hour": null,
            "estimated_eur": null,
            "label": "Fabric-equivalent usage estimate; not an Azure invoice"
          },
          "databricks_like": {
            "dbu_equivalent": null,
            "price_input_usd_per_dbu": null,
            "estimated_usd": null,
            "label": "DBU-equivalent teaching adapter; use dated vendor list price for money"
          }
        },
        "stages": [
          {
            "id": 1,
            "name": "Parquet scan + filter",
            "tasks": 286,
            "workers": 16,
            "slots": 128,
            "duration_s": 2.087,
            "spill_gb": 0.0,
            "max_task_s": 0.94,
            "p50_task_s": 0.67,
            "p95_task_s": 0.812,
            "max_partition_mb": 151.237,
            "skewed_tasks": 0,
            "notes": []
          },
          {
            "id": 2,
            "name": "SortMergeJoin + Exchange",
            "tasks": 225,
            "workers": 15,
            "slots": 120,
            "duration_s": 4.404,
            "spill_gb": 0.0,
            "max_task_s": 2.58,
            "p50_task_s": 1.172,
            "p95_task_s": 2.496,
            "max_partition_mb": 209.823,
            "skewed_tasks": 0,
            "notes": [
              "AQE split 1656 MB skewed partition into 26 ~64 MB tasks",
              "Catalog statistics are intentionally unavailable in this exercise; no static auto-broadcast"
            ]
          },
          {
            "id": 3,
            "name": "Exchange + HashAggregate(customer_id)",
            "tasks": 225,
            "workers": 15,
            "slots": 120,
            "duration_s": 3.988,
            "spill_gb": 0.0,
            "max_task_s": 2.318,
            "p50_task_s": 1.066,
            "p95_task_s": 2.243,
            "max_partition_mb": 209.823,
            "skewed_tasks": 0,
            "notes": [
              "AQE split 1656 MB skewed partition into 26 ~64 MB tasks"
            ]
          }
        ]
      },
      "optimized": {
        "duration_s": 13.233,
        "core_hours": 0.3133,
        "worker_core_hours": 0.2839,
        "driver_core_hours": 0.0294,
        "task_core_hours": 0.1971,
        "cluster_utilization_pct": 69.4,
        "memory_gb_hours": 2.5062,
        "driver_memory_gb_hours": 0.2353,
        "node_hours": 0.0392,
        "worker_node_hours": 0.0355,
        "shuffle_gb": 26.4,
        "spill_gb": 0.0,
        "plan_decision": {
          "initial_join": "BroadcastHashJoin",
          "final_join": "BroadcastHashJoin",
          "reason": "explicit broadcast hint",
          "join_shuffle_avoided": true
        },
        "cost": {
          "sparklab": {
            "scc": 1.683,
            "eur_per_scc": 0.1,
            "estimated_eur": 0.168,
            "label": "SparkLab training price"
          },
          "fabric_like": {
            "cu_hours": 0.1567,
            "price_input_eur_per_cu_hour": null,
            "estimated_eur": null,
            "label": "Fabric-equivalent usage estimate; not an Azure invoice"
          },
          "databricks_like": {
            "dbu_equivalent": null,
            "price_input_usd_per_dbu": null,
            "estimated_usd": null,
            "label": "DBU-equivalent teaching adapter; use dated vendor list price for money"
          }
        },
        "stages": [
          {
            "id": 1,
            "name": "Parquet scan + filter",
            "tasks": 286,
            "workers": 16,
            "slots": 128,
            "duration_s": 2.087,
            "spill_gb": 0.0,
            "max_task_s": 0.94,
            "p50_task_s": 0.67,
            "p95_task_s": 0.812,
            "max_partition_mb": 151.237,
            "skewed_tasks": 0,
            "notes": []
          },
          {
            "id": 2,
            "name": "BroadcastHashJoin",
            "tasks": 286,
            "workers": 16,
            "slots": 128,
            "duration_s": 2.158,
            "spill_gb": 0.0,
            "max_task_s": 0.976,
            "p50_task_s": 0.693,
            "p95_task_s": 0.842,
            "max_partition_mb": 151.237,
            "skewed_tasks": 0,
            "notes": [
              "Explicit broadcast build side: 6.4 MB; fact-side join shuffle avoided"
            ]
          },
          {
            "id": 3,
            "name": "Exchange + HashAggregate(customer_id)",
            "tasks": 225,
            "workers": 15,
            "slots": 120,
            "duration_s": 3.988,
            "spill_gb": 0.0,
            "max_task_s": 2.318,
            "p50_task_s": 1.066,
            "p95_task_s": 2.243,
            "max_partition_mb": 209.823,
            "skewed_tasks": 0,
            "notes": [
              "AQE split 1656 MB skewed partition into 26 ~64 MB tasks"
            ]
          }
        ]
      },
      "skew": {
        "duration_s": 11.075,
        "core_hours": 0.2317,
        "worker_core_hours": 0.2071,
        "driver_core_hours": 0.0246,
        "task_core_hours": 0.1421,
        "cluster_utilization_pct": 68.6,
        "memory_gb_hours": 1.854,
        "driver_memory_gb_hours": 0.1969,
        "node_hours": 0.029,
        "worker_node_hours": 0.0259,
        "shuffle_gb": 26.4,
        "spill_gb": 0.0,
        "plan_decision": {
          "initial_join": null,
          "final_join": null,
          "reason": "aggregation-only skew exercise",
          "join_shuffle_avoided": null,
          "aqe_skew_split": true
        },
        "cost": {
          "sparklab": {
            "scc": 1.589,
            "eur_per_scc": 0.1,
            "estimated_eur": 0.159,
            "label": "SparkLab training price"
          },
          "fabric_like": {
            "cu_hours": 0.1158,
            "price_input_eur_per_cu_hour": null,
            "estimated_eur": null,
            "label": "Fabric-equivalent usage estimate; not an Azure invoice"
          },
          "databricks_like": {
            "dbu_equivalent": null,
            "price_input_usd_per_dbu": null,
            "estimated_usd": null,
            "label": "DBU-equivalent teaching adapter; use dated vendor list price for money"
          }
        },
        "stages": [
          {
            "id": 1,
            "name": "Parquet scan + filter",
            "tasks": 286,
            "workers": 16,
            "slots": 128,
            "duration_s": 2.087,
            "spill_gb": 0.0,
            "max_task_s": 0.94,
            "p50_task_s": 0.67,
            "p95_task_s": 0.812,
            "max_partition_mb": 151.237,
            "skewed_tasks": 0,
            "notes": []
          },
          {
            "id": 2,
            "name": "Exchange + HashAggregate(customer_id)",
            "tasks": 225,
            "workers": 15,
            "slots": 120,
            "duration_s": 3.988,
            "spill_gb": 0.0,
            "max_task_s": 2.318,
            "p50_task_s": 1.066,
            "p95_task_s": 2.243,
            "max_partition_mb": 209.823,
            "skewed_tasks": 0,
            "notes": [
              "AQE split 1656 MB skewed partition into 26 ~64 MB tasks",
              "Known hot key: CORPORATE_ACCOUNT_01"
            ]
          }
        ]
      }
    },
    "databricks_jobs_like": {
      "baseline": {
        "duration_s": 36.767,
        "core_hours": 0.3955,
        "worker_core_hours": 0.3138,
        "driver_core_hours": 0.0817,
        "task_core_hours": 0.2257,
        "cluster_utilization_pct": 71.9,
        "memory_gb_hours": 2.8371,
        "driver_memory_gb_hours": 0.3268,
        "node_hours": 0.0494,
        "worker_node_hours": 0.0392,
        "shuffle_gb": 52.806,
        "spill_gb": 0.0,
        "plan_decision": {
          "initial_join": "SortMergeJoin",
          "final_join": "SortMergeJoin",
          "reason": "no broadcast hint and no catalog size statistics in this calibrated scenario",
          "join_shuffle_avoided": false
        },
        "cost": {
          "sparklab": {
            "scc": 3.093,
            "eur_per_scc": 0.1,
            "estimated_eur": 0.309,
            "label": "SparkLab training price"
          },
          "fabric_like": {
            "cu_hours": null,
            "price_input_eur_per_cu_hour": null,
            "estimated_eur": null,
            "label": "Fabric-equivalent usage estimate; not an Azure invoice"
          },
          "databricks_like": {
            "dbu_equivalent": 0.0494,
            "price_input_usd_per_dbu": null,
            "estimated_usd": null,
            "label": "DBU-equivalent teaching adapter; use dated vendor list price for money"
          }
        },
        "stages": [
          {
            "id": 1,
            "name": "Parquet scan + filter",
            "tasks": 286,
            "workers": 12,
            "slots": 96,
            "duration_s": 2.172,
            "spill_gb": 0.0,
            "max_task_s": 0.892,
            "p50_task_s": 0.64,
            "p95_task_s": 0.773,
            "max_partition_mb": 151.237,
            "skewed_tasks": 0,
            "notes": []
          },
          {
            "id": 2,
            "name": "SortMergeJoin + Exchange",
            "tasks": 225,
            "workers": 12,
            "slots": 96,
            "duration_s": 5.041,
            "spill_gb": 0.0,
            "max_task_s": 2.399,
            "p50_task_s": 1.099,
            "p95_task_s": 2.321,
            "max_partition_mb": 209.823,
            "skewed_tasks": 0,
            "notes": [
              "AQE split 1656 MB skewed partition into 26 ~64 MB tasks",
              "Catalog statistics are intentionally unavailable in this exercise; no static auto-broadcast"
            ]
          },
          {
            "id": 3,
            "name": "Exchange + HashAggregate(customer_id)",
            "tasks": 225,
            "workers": 12,
            "slots": 96,
            "duration_s": 4.554,
            "spill_gb": 0.0,
            "max_task_s": 2.157,
            "p50_task_s": 1.001,
            "p95_task_s": 2.088,
            "max_partition_mb": 209.823,
            "skewed_tasks": 0,
            "notes": [
              "AQE split 1656 MB skewed partition into 26 ~64 MB tasks"
            ]
          }
        ]
      },
      "optimized": {
        "duration_s": 33.974,
        "core_hours": 0.3148,
        "worker_core_hours": 0.2393,
        "driver_core_hours": 0.0755,
        "task_core_hours": 0.1864,
        "cluster_utilization_pct": 77.9,
        "memory_gb_hours": 2.2164,
        "driver_memory_gb_hours": 0.302,
        "node_hours": 0.0394,
        "worker_node_hours": 0.0299,
        "shuffle_gb": 26.4,
        "spill_gb": 0.0,
        "plan_decision": {
          "initial_join": "BroadcastHashJoin",
          "final_join": "BroadcastHashJoin",
          "reason": "explicit broadcast hint",
          "join_shuffle_avoided": true
        },
        "cost": {
          "sparklab": {
            "scc": 1.679,
            "eur_per_scc": 0.1,
            "estimated_eur": 0.168,
            "label": "SparkLab training price"
          },
          "fabric_like": {
            "cu_hours": null,
            "price_input_eur_per_cu_hour": null,
            "estimated_eur": null,
            "label": "Fabric-equivalent usage estimate; not an Azure invoice"
          },
          "databricks_like": {
            "dbu_equivalent": 0.0394,
            "price_input_usd_per_dbu": null,
            "estimated_usd": null,
            "label": "DBU-equivalent teaching adapter; use dated vendor list price for money"
          }
        },
        "stages": [
          {
            "id": 1,
            "name": "Parquet scan + filter",
            "tasks": 286,
            "workers": 12,
            "slots": 96,
            "duration_s": 2.172,
            "spill_gb": 0.0,
            "max_task_s": 0.892,
            "p50_task_s": 0.64,
            "p95_task_s": 0.773,
            "max_partition_mb": 151.237,
            "skewed_tasks": 0,
            "notes": []
          },
          {
            "id": 2,
            "name": "BroadcastHashJoin",
            "tasks": 286,
            "workers": 12,
            "slots": 96,
            "duration_s": 2.248,
            "spill_gb": 0.0,
            "max_task_s": 0.926,
            "p50_task_s": 0.661,
            "p95_task_s": 0.8,
            "max_partition_mb": 151.237,
            "skewed_tasks": 0,
            "notes": [
              "Explicit broadcast build side: 6.4 MB; fact-side join shuffle avoided"
            ]
          },
          {
            "id": 3,
            "name": "Exchange + HashAggregate(customer_id)",
            "tasks": 225,
            "workers": 12,
            "slots": 96,
            "duration_s": 4.554,
            "spill_gb": 0.0,
            "max_task_s": 2.157,
            "p50_task_s": 1.001,
            "p95_task_s": 2.088,
            "max_partition_mb": 209.823,
            "skewed_tasks": 0,
            "notes": [
              "AQE split 1656 MB skewed partition into 26 ~64 MB tasks"
            ]
          }
        ]
      },
      "skew": {
        "duration_s": 31.726,
        "core_hours": 0.2499,
        "worker_core_hours": 0.1794,
        "driver_core_hours": 0.0705,
        "task_core_hours": 0.1339,
        "cluster_utilization_pct": 74.7,
        "memory_gb_hours": 1.7169,
        "driver_memory_gb_hours": 0.282,
        "node_hours": 0.0312,
        "worker_node_hours": 0.0224,
        "shuffle_gb": 26.4,
        "spill_gb": 0.0,
        "plan_decision": {
          "initial_join": null,
          "final_join": null,
          "reason": "aggregation-only skew exercise",
          "join_shuffle_avoided": null,
          "aqe_skew_split": true
        },
        "cost": {
          "sparklab": {
            "scc": 1.604,
            "eur_per_scc": 0.1,
            "estimated_eur": 0.16,
            "label": "SparkLab training price"
          },
          "fabric_like": {
            "cu_hours": null,
            "price_input_eur_per_cu_hour": null,
            "estimated_eur": null,
            "label": "Fabric-equivalent usage estimate; not an Azure invoice"
          },
          "databricks_like": {
            "dbu_equivalent": 0.0312,
            "price_input_usd_per_dbu": null,
            "estimated_usd": null,
            "label": "DBU-equivalent teaching adapter; use dated vendor list price for money"
          }
        },
        "stages": [
          {
            "id": 1,
            "name": "Parquet scan + filter",
            "tasks": 286,
            "workers": 12,
            "slots": 96,
            "duration_s": 2.172,
            "spill_gb": 0.0,
            "max_task_s": 0.892,
            "p50_task_s": 0.64,
            "p95_task_s": 0.773,
            "max_partition_mb": 151.237,
            "skewed_tasks": 0,
            "notes": []
          },
          {
            "id": 2,
            "name": "Exchange + HashAggregate(customer_id)",
            "tasks": 225,
            "workers": 12,
            "slots": 96,
            "duration_s": 4.554,
            "spill_gb": 0.0,
            "max_task_s": 2.157,
            "p50_task_s": 1.001,
            "p95_task_s": 2.088,
            "max_partition_mb": 209.823,
            "skewed_tasks": 0,
            "notes": [
              "AQE split 1656 MB skewed partition into 26 ~64 MB tasks",
              "Known hot key: CORPORATE_ACCOUNT_01"
            ]
          }
        ]
      }
    }
  },
  "workspace": {
    "capacity_cores": 128,
    "used_cores": 88,
    "available_cores": 40,
    "running": [
      {
        "name": "Analyst notebook",
        "requested_cores": 24,
        "duration_min": 18
      },
      {
        "name": "Nightly ETL",
        "requested_cores": 64,
        "duration_min": 31
      }
    ],
    "queued": [
      {
        "name": "Historical backfill",
        "requested_cores": 64,
        "duration_min": 42
      }
    ]
  }
} as const
