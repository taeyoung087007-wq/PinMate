package com.pinmate;

import org.apache.ibatis.annotations.Mapper;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
// 기능별(auth/pin/team/...) dao 패키지에 흩어져 있으므로 @Mapper 가 붙은 인터페이스만 스캔한다.
// 이렇게 하면 기능이 늘어나도 이 설정을 고칠 필요가 없다.
@MapperScan(basePackages = "com.pinmate", annotationClass = Mapper.class)
public class PinmateApplication {

	public static void main(String[] args) {
		SpringApplication.run(PinmateApplication.class, args);
	}

}
