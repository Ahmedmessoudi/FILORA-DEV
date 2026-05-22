package com.filora.dms.service;

import com.filora.dms.config.AppProperties;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.List;
import java.util.Properties;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final AppProperties appProperties;

    private JavaMailSenderImpl getMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(appProperties.getMail().getHost());
        mailSender.setPort(appProperties.getMail().getPort());
        mailSender.setUsername(appProperties.getMail().getUsername());
        mailSender.setPassword(appProperties.getMail().getPassword());

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.debug", "false");

        return mailSender;
    }

    @Async
    public void sendEmail(String to, String subject, String body, List<File> attachments) {
        sendEmail(new String[]{to}, subject, body, attachments);
    }

    @Async
    public void sendEmail(String[] to, String subject, String body, List<File> attachments) {
        log.info("Preparing to send email to: {}", String.join(", ", to));
        try {
            JavaMailSenderImpl mailSender = getMailSender();
            MimeMessage message = mailSender.createMimeMessage();
            
            // True indicates multipart for attachments
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(appProperties.getMail().getUsername());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, true); // true indicates HTML content

            if (attachments != null) {
                for (File file : attachments) {
                    FileSystemResource res = new FileSystemResource(file);
                    helper.addAttachment(file.getName(), res);
                }
            }

            mailSender.send(message);
            log.info("Email sent successfully to: {}", String.join(", ", to));
        } catch (Exception e) {
            log.error("Failed to send email to: {}. Error: {}", String.join(", ", to), e.getMessage());
            throw new RuntimeException("Email sending failed", e);
        }
    }
}
