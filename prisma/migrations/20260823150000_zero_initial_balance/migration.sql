-- Saldo inicial do mes deixou de ser usado; sobras do mes anterior passam a ser lancadas como receita.
UPDATE "monthly_plans" SET "initial_balance" = 0;
