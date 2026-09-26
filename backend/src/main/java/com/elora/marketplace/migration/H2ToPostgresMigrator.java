package com.elora.marketplace.migration;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** One-time, opt-in migration of the local H2 marketplace data to PostgreSQL. */
@Component
@ConditionalOnProperty(name = "elora.migration.h2-to-postgres.enabled", havingValue = "true")
public class H2ToPostgresMigrator implements ApplicationRunner {
    private static final List<String> TABLES = List.of("users", "products", "services", "orders", "order_items");
    private static final String H2_URL = "jdbc:h2:file:./database/data/elora;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE";

    private final JdbcTemplate postgres;

    public H2ToPostgresMigrator(JdbcTemplate postgres) {
        this.postgres = postgres;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (Connection source = DriverManager.getConnection(H2_URL, "sa", "");
             Connection target = postgres.getDataSource().getConnection()) {
            target.setAutoCommit(false);
            try {
                for (String table : TABLES) {
                    long existing = postgres.queryForObject("SELECT COUNT(*) FROM \"" + table + "\"", Long.class);
                    if (existing != 0) {
                        throw new IllegalStateException("Migration stopped: PostgreSQL table " + table + " is not empty.");
                    }
                }

                for (String table : TABLES) {
                    int copied = copyTable(source, target, table);
                    System.out.println("H2 → PostgreSQL: " + table + " — " + copied + " registros");
                }
                target.commit();
                resetSequences(target);
                System.out.println("Migração H2 → PostgreSQL concluída. O arquivo H2 original foi mantido.");
            } catch (Exception exception) {
                target.rollback();
                throw exception;
            }
        }
    }

    private int copyTable(Connection source, Connection target, String table) throws Exception {
        String h2Table = table.toUpperCase(Locale.ROOT);
        try (Statement select = source.createStatement();
             ResultSet rows = select.executeQuery("SELECT * FROM \"" + h2Table + "\"")) {
            ResultSetMetaData metadata = rows.getMetaData();
            List<String> columns = new ArrayList<>();
            for (int i = 1; i <= metadata.getColumnCount(); i++) {
                columns.add(metadata.getColumnLabel(i).toLowerCase(Locale.ROOT));
            }
            String quotedColumns = columns.stream().map(c -> "\"" + c + "\"").reduce((a, b) -> a + ", " + b).orElseThrow();
            String placeholders = String.join(", ", java.util.Collections.nCopies(columns.size(), "?"));
            String insertSql = "INSERT INTO \"" + table + "\" (" + quotedColumns + ") VALUES (" + placeholders + ")";
            try (var insert = target.prepareStatement(insertSql)) {
                int count = 0;
                while (rows.next()) {
                    for (int i = 1; i <= columns.size(); i++) insert.setObject(i, rows.getObject(i));
                    insert.addBatch();
                    count++;
                    if (count % 500 == 0) {
                        insert.executeBatch();
                        insert.clearBatch();
                    }
                }
                insert.executeBatch();
                return count;
            }
        }
    }

    private void resetSequences(Connection target) throws Exception {
        for (String table : TABLES) {
            String sql = "SELECT setval(pg_get_serial_sequence(?, 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM \"" + table + "\"";
            try (var reset = target.prepareStatement(sql)) {
                reset.setString(1, table);
                reset.execute();
            }
        }
    }
}
