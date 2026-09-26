package com.elora.marketplace.service;

import com.elora.marketplace.model.AppUser;
import com.elora.marketplace.model.MarketplaceNotification;
import com.elora.marketplace.repository.MarketplaceNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service @RequiredArgsConstructor
public class MarketplaceNotificationService {
    private final MarketplaceNotificationRepository notifications;

    public void notify(AppUser recipient, String type, String title, String message, String link) {
        if (recipient == null) return;
        MarketplaceNotification notification = new MarketplaceNotification();
        notification.setUser(recipient); notification.setType(type); notification.setTitle(title);
        notification.setMessage(message); notification.setLink(link);
        notifications.save(notification);
    }
}
