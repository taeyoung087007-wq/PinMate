package com.pinmate;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.pinmate.dao")
public class PinmateApplication {

	public static void main(String[] args) {
		SpringApplication.run(PinmateApplication.class, args);
	}

}
