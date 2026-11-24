package com.fitbitepal.backend;

import com.fitbitepal.backend.repository.UserRepository;
import com.fitbitepal.backend.scheduler.DailyUserBatch;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class DailyUserBatchTest {
    @Test
    void advancesTheCursorPastFailuresAndStopsAtTheOriginalUpperBound() {
        var users = mock(UserRepository.class);
        var page = PageRequest.of(0, 200);
        when(users.lastId()).thenReturn(208L);
        when(users.nextIds(0, 208, page)).thenReturn(List.of(3L, 5L));
        when(users.nextIds(5, 208, page)).thenReturn(List.of(205L, 208L));
        var processed = new ArrayList<Long>();
        new DailyUserBatch(users).run("fixture", id -> {
            if (id == 5L) throw new IllegalArgumentException("fixture failure");
            processed.add(id);
        });
        assertThat(processed).containsExactly(3L, 205L, 208L);
        verify(users, times(1)).lastId();
        verify(users).nextIds(0, 208, page);
        verify(users).nextIds(5, 208, page);
        verifyNoMoreInteractions(users);
    }
}
