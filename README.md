# Electron & Vaadin Hilla Template

The goal of this template is to allow you to create a desktop app using React for the UI and Java for the application logic.

This project is inspired in two repositories:
- https://github.com/vaadin/skeleton-starter-hilla-react
- https://github.com/space/my-electron-vaadin-app

This skeleton uses:

- Java 21
- Vaadin: 24.6.6 (the latest available)
- Small Ant build script on top of maven to add a bit of old good procedural logic to the build process

To build:

- Install Java JDK 21 and define your JAVA_HOME
- Install Ant (1.10.14) and define your ANT_HOME
- Install Maven (3.9.6 works) and define your MAVEN_HOME
- For Vaadin build install also node (mine is 23.8.0) and npm (mine is 11.1.0)

then run:

    ant

and the list of available task will be printed:

    clean             Clean all not essential elements using maven
    clean.all         Clean all not essential elements (including all boring JS related Vaadin config)
    package.electron  Create Electron app ready for distribution  

so to create the final Electron bundle (for Win, Mac and Linux):

    ant package.electron

than take a coffee (first full build take 20 min on my machine...)

If you just want to use maven:

    mvn clean package -Pproduction

and at the end of the process the electron packaged applications (for Win64, Linux and Mac) will be in:

    ./target/electron


To develop and test the application you can run:

    ./mvnw spring-boot:run

## Some notes
By default this template creates the executable for Linux. To build fot Mac or Windows do the following:
- in the `build.xml` file change `${env.MAVEN_HOME}\bin\mvn` to `${env.MAVEN_HOME}/bin/mvn.cmd` in the case of Windows;
- in the `pom.xml` uncomment the execution for the desired platform (lines 203 to 235).
