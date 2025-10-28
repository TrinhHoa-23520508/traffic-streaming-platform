:::
@echo off
setlocal

rem Maven Wrapper Script for Windows

set MAVEN_HOME=%~dp0.mvn\wrapper
set MAVEN_OPTS=-Xmx1024m -XX:MaxPermSize=256m

if not exist "%MAVEN_HOME%\maven-wrapper.jar" (
    echo Maven Wrapper not found. Please run mvnw to download it.
    exit /b 1
)

java -cp "%MAVEN_HOME%\maven-wrapper.jar" org.apache.maven.wrapper.MavenWrapperMain %*
endlocal
:::