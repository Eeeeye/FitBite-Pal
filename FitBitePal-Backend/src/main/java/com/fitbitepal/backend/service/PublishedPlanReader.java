package com.fitbitepal.backend.service;

import com.fitbitepal.backend.model.User;
import com.fitbitepal.backend.repository.UserRepository;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.Supplier;

import static com.fitbitepal.backend.config.RedisConfig.CACHE_PLAN_VERSION;

/** A published plan is read without locking the user. Only first publication acquires the writer lock. */
@Service
public class PublishedPlanReader {
    private final CacheManager caches;
    private final UserRepository users;
    private final TransactionTemplate publication;

    public PublishedPlanReader(CacheManager caches, UserRepository users, PlatformTransactionManager transactions) {
        this.caches = caches;
        this.users = users;
        this.publication = new TransactionTemplate(transactions);
        this.publication.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @SuppressWarnings("unchecked") // RedisConfig fixes the element type of each plan cache.
    <T> List<T> read(String cacheName, Long userId, LocalDate date, Supplier<List<T>> findPublished,
                     Function<User, List<T>> ensureLocked) {
        Cache cache = Objects.requireNonNull(caches.getCache(cacheName));
        // Pin the version before reading MySQL. If a writer commits in between, this key becomes unreachable.
        String key = userId + ":" + date + ":" + version(userId);
        Cache.ValueWrapper hit = cache.get(key);
        if (hit != null) return (List<T>) hit.get();

        List<T> rows = findPublished.get();
        if (rows.isEmpty()) {
            // Under REPEATABLE READ, the initial miss must not establish the writer transaction's read view.
            rows = publication.execute(status -> users.findForUpdate(userId)
                    .map(ensureLocked).orElseGet(List::of));
        }
        if (!rows.isEmpty()) cache.put(key, rows);
        return rows;
    }

    private String version(Long userId) {
        Cache versions = Objects.requireNonNull(caches.getCache(CACHE_PLAN_VERSION));
        String current = versions.get(userId, String.class);
        if (current != null) return current;

        // Random generations never get reused when a marker expires or is evicted on commit.
        String fresh = UUID.randomUUID().toString();
        Cache.ValueWrapper existing = versions.putIfAbsent(userId, fresh);
        return existing == null ? fresh : (String) existing.get();
    }
}
