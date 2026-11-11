package com.hotel.hms.operations;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;

/** Prevent persistence access from leaking back into Module E's HTTP and business layers. */
class OperationsLayeringTests {
    private static final Path ROOT = Path.of("src/main/java/com/hotel/hms/operations");

    @Test
    void servicesDoNotExecuteQueriesOrUseJdbcTypes() throws Exception {
        assertNoImports(
                "service",
                "org\\.springframework\\.jdbc\\.|java\\.sql\\.|jakarta\\.persistence\\.");
        try (var files = Files.list(ROOT.resolve("service"))) {
            for (var file : files.filter(path -> path.toString().endsWith(".java")).toList()) {
                String source = Files.readString(file);
                assertFalse(
                        Pattern.compile("\\b(?:SELECT|UPDATE|INSERT|DELETE)\\s+(?:\\*|[a-zA-Z_])")
                                .matcher(source)
                                .find(),
                        () -> file + " must delegate SQL to a repository");
            }
        }
    }

    @Test
    void controllersOnlyOrchestrateServices() throws Exception {
        assertNoImports(
                "controller",
                "com\\.hotel\\.hms\\.operations\\.repository\\.|org\\.springframework\\.jdbc\\.");
    }

    @Test
    void repositoriesDoNotDependOnBusinessServices() throws Exception {
        assertNoImports("repository", "com\\.hotel\\.hms\\.operations\\.service\\.");
    }

    private void assertNoImports(String directory, String forbidden) throws Exception {
        Pattern pattern = Pattern.compile("(?m)^import\\s+(?:static\\s+)?(?:" + forbidden + ")");
        try (var files = Files.list(ROOT.resolve(directory))) {
            for (var file : files.filter(path -> path.toString().endsWith(".java")).toList()) {
                assertFalse(
                        pattern.matcher(Files.readString(file)).find(),
                        () -> file + " violates the controller-service-repository boundary");
            }
        }
    }
}
