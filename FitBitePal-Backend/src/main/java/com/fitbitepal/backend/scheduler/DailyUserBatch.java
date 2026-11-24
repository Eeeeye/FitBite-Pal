package com.fitbitepal.backend.scheduler;

import com.fitbitepal.backend.repository.UserRepository;
import java.util.List;
import java.util.function.LongConsumer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DailyUserBatch {
    private static final PageRequest PAGE = PageRequest.of(0, 200);
    private final UserRepository users;

    public void run(String job, LongConsumer process) {
        Long last = users.lastId();
        if (last == null) return;
        long after = 0;
        long processed = 0;
        long failed = 0;
        while (after < last) {
            List<Long> ids = users.nextIds(after, last, PAGE);
            if (ids.isEmpty()) break;
            for (long id : ids) {
                try {
                    process.accept(id);
                    processed++;
                } catch (RuntimeException ex) {
                    failed++;
                    log.error("{} failed for user {}", job, id, ex);
                }
            }
            after = ids.get(ids.size() - 1);
        }
        log.info("{} finished: processed={}, failed={}", job, processed, failed);
    }
}
