import java.io.File
import java.util.Properties
import org.gradle.api.tasks.Exec

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val localProperties =
    Properties().apply {
        val localPropertiesFile = rootProject.file("local.properties")
        if (localPropertiesFile.exists()) {
            localPropertiesFile.inputStream().use(::load)
        }
    }

val flutterBinPath =
    localProperties.getProperty("flutter.sdk")?.let { flutterSdk ->
        File(flutterSdk, "bin").absolutePath
    }

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)

    if (flutterBinPath != null) {
        tasks.withType<Exec>().configureEach {
            val existingPath = environment["PATH"]?.toString() ?: System.getenv("PATH").orEmpty()
            environment("PATH", "$flutterBinPath${File.pathSeparator}$existingPath")
        }
    }
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
